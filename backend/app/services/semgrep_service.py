"""
semgrep_service.py
Runs Semgrep security scans on a temporarily cloned GitHub repository.
Handles lifecycle, execution security, error states, and cleanup.
"""

import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict

from fastapi import HTTPException
from app.services.repository_service import parse_github_url, CLONE_TIMEOUT_SECONDS, cleanup_directory
from app.services.normalization_service import normalize_semgrep_results

SEMGREP_SCAN_TIMEOUT_SECONDS = 180


def _find_semgrep_binary() -> str:
    """Find the semgrep executable in the active Python environment or PATH."""
    py_dir = Path(sys.executable).parent
    for candidate in ("semgrep.exe", "semgrep"):
        p = py_dir / candidate
        if p.is_file():
            return str(p)

    which_path = shutil.which("semgrep")
    if which_path:
        return which_path

    raise HTTPException(
        status_code=500,
        detail="Semgrep is not installed or not available on PATH.",
    )


def _clone_repo(canonical_url: str, target_dir: Path) -> None:
    """Shallow clones the repository with safety checks."""
    try:
        subprocess.run(["git", "--version"], check=True, capture_output=True, timeout=10)
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Git is not installed or not available on PATH.",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Git command timed out.")

    try:
        result = subprocess.run(
            ["git", "clone", "--depth", "1", canonical_url, str(target_dir)],
            capture_output=True,
            text=True,
            timeout=CLONE_TIMEOUT_SECONDS,
        )
        if result.returncode != 0:
            stderr = result.stderr.strip()
            if "Repository not found" in stderr or "not found" in stderr.lower():
                raise HTTPException(
                    status_code=404,
                    detail=f"Repository '{canonical_url}' not found. It may be private or does not exist.",
                )
            if "Authentication failed" in stderr or "could not read" in stderr.lower():
                raise HTTPException(
                    status_code=403,
                    detail="Repository is private. Only public repositories are supported.",
                )
            raise HTTPException(
                status_code=502,
                detail=f"Failed to clone repository: {stderr[:300]}",
            )
        if not target_dir.exists():
            raise HTTPException(
                status_code=502,
                detail="Clone appeared to succeed but directory was not created.",
            )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail=f"Cloning repository timed out after {CLONE_TIMEOUT_SECONDS} seconds.",
        )


def _run_semgrep(semgrep_bin: str, target_dir: Path) -> Dict[str, Any]:
    """
    Executes Semgrep scan using subprocess (never shell=True) and returns parsed JSON.
    """
    cmd = [
        semgrep_bin,
        "scan",
        "--config",
        "auto",
        "--json",
        str(target_dir),
    ]

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=SEMGREP_SCAN_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail=f"Semgrep security scan timed out after {SEMGREP_SCAN_TIMEOUT_SECONDS} seconds.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to execute Semgrep process: {str(e)}",
        )

    output = proc.stdout.strip()
    if not output:
        stderr_sample = proc.stderr.strip()[:300]
        raise HTTPException(
            status_code=502,
            detail=f"Semgrep produced empty output. Stderr: {stderr_sample}",
        )

    try:
        parsed = json.loads(output)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Malformed JSON received from Semgrep: {str(e)}",
        )

    return parsed


def scan_repository(repository_url: str) -> Dict[str, Any]:
    """
    Coordinates the full Semgrep scan lifecycle:
    1. Validates the GitHub URL
    2. Creates a temporary directory
    3. Shallow-clones the repo
    4. Executes Semgrep with auto rules
    5. Normalizes findings into StackInsight models
    6. Ensures complete cleanup of the temporary clone
    """
    owner, repo_name, canonical_url = parse_github_url(repository_url)
    semgrep_bin = _find_semgrep_binary()

    tmp_dir = tempfile.mkdtemp(prefix="stackinsight_scan_")
    clone_path = Path(tmp_dir) / repo_name

    try:
        _clone_repo(canonical_url, clone_path)
        raw_semgrep_output = _run_semgrep(semgrep_bin, clone_path)
        raw_results = raw_semgrep_output.get("results", [])
        findings, severity_summary = normalize_semgrep_results(raw_results, clone_path)

        return {
            "status": "completed",
            "repository": {
                "owner": owner,
                "name": repo_name,
                "url": canonical_url,
            },
            "scanner": "semgrep",
            "total_findings": len(findings),
            "severity_summary": severity_summary.model_dump(),
            "findings": [f.model_dump() for f in findings],
        }
    finally:
        cleanup_directory(tmp_dir)