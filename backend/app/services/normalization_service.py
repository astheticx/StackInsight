"""
normalization_service.py
Normalizes raw Semgrep JSON findings into StackInsight findings.
Maps severities into: CRITICAL, HIGH, MEDIUM, LOW, INFO.
"""

from pathlib import Path
from typing import Any, Dict, List, Tuple
from app.schemas.scan import Finding, SeveritySummary


def map_severity(raw_severity: str, metadata: Dict[str, Any]) -> str:
    """
    Maps Semgrep's severity string and metadata into a StackInsight severity:
    CRITICAL, HIGH, MEDIUM, LOW, INFO.
    """
    s = (raw_severity or "").upper().strip()
    impact = str(metadata.get("impact", "")).upper().strip()

    if s == "CRITICAL" or impact == "CRITICAL":
        return "CRITICAL"

    if s == "ERROR":
        if impact in ("HIGH", "CRITICAL"):
            return "HIGH"
        return "HIGH"

    if s == "WARNING":
        return "MEDIUM"

    if s == "INFO":
        return "LOW"

    if s in ("INVENTORY", "EXPERIMENT"):
        return "INFO"

    return "MEDIUM"


def _extract_list(val: Any) -> List[str]:
    """Helper to safely extract a list of strings from metadata fields like cwe or owasp."""
    if not val:
        return []
    if isinstance(val, list):
        return [str(item) for item in val if item]
    if isinstance(val, str):
        return [val]
    return []


def _format_title(check_id: str, metadata: Dict[str, Any]) -> str:
    """Generate a clean, human-readable title for the finding."""
    vuln_class = metadata.get("vulnerability_class")
    if isinstance(vuln_class, list) and vuln_class:
        return str(vuln_class[0])
    if isinstance(vuln_class, str) and vuln_class:
        return vuln_class

    # Fallback to rule id's trailing identifier formatted cleanly
    parts = check_id.split(".")
    short_name = parts[-1] if parts else check_id
    clean_title = short_name.replace("-", " ").replace("_", " ").title()
    return clean_title


def normalize_semgrep_results(
    raw_results: List[Dict[str, Any]],
    repo_dir: Path
) -> Tuple[List[Finding], SeveritySummary]:
    """
    Normalizes a list of raw Semgrep result dicts into StackInsight Finding objects
    and computes the severity summary.
    """
    findings: List[Finding] = []
    summary_counts = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
        "INFO": 0,
    }

    # Normalize repo_dir path for prefix removal
    repo_dir_str = str(repo_dir.resolve()).replace("\\", "/").rstrip("/")

    for item in raw_results:
        check_id = item.get("check_id", "unknown-rule")
        raw_path = str(item.get("path", "")).replace("\\", "/")

        # Strip repository root to keep path relative and hide temp directory
        if raw_path.startswith(repo_dir_str):
            rel_path = raw_path[len(repo_dir_str):].lstrip("/")
        else:
            rel_path = raw_path.split("/")[-1] if "/" in raw_path else raw_path

        extra = item.get("extra", {})
        metadata = extra.get("metadata", {}) or {}
        raw_severity = extra.get("severity", "")
        message = extra.get("message", "").strip()

        severity = map_severity(raw_severity, metadata)
        summary_counts[severity] = summary_counts.get(severity, 0) + 1

        start_line = item.get("start", {}).get("line", 1)
        end_line = item.get("end", {}).get("line", start_line)

        title = _format_title(check_id, metadata)
        cwe = _extract_list(metadata.get("cwe"))
        owasp = _extract_list(metadata.get("owasp"))

        finding = Finding(
            scanner="semgrep",
            rule_id=check_id,
            title=title,
            description=message,
            severity=severity,
            file_path=rel_path,
            start_line=start_line,
            end_line=end_line,
            cwe=cwe,
            owasp=owasp,
        )
        findings.append(finding)

    summary = SeveritySummary(
        critical=summary_counts["CRITICAL"],
        high=summary_counts["HIGH"],
        medium=summary_counts["MEDIUM"],
        low=summary_counts["LOW"],
        info=summary_counts["INFO"],
    )

    return findings, summary