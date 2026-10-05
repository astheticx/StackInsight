from pydantic import BaseModel
from typing import List, Optional
from app.schemas.repository import RepositoryInfo


class Finding(BaseModel):
    scanner: str = "semgrep"
    rule_id: str
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    file_path: str
    start_line: int
    end_line: int
    cwe: List[str] = []
    owasp: List[str] = []


class SeveritySummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class ScanResponse(BaseModel):
    status: str = "completed"
    repository: RepositoryInfo
    scanner: str = "semgrep"
    total_findings: int = 0
    severity_summary: SeveritySummary
    findings: List[Finding] = []