from fastapi import APIRouter
from app.schemas.repository import RepositoryRequest
from app.schemas.scan import ScanResponse
from app.services.semgrep_service import scan_repository

router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.post("/semgrep", response_model=ScanResponse)
def run_semgrep_scan(request: RepositoryRequest):
    """
    Executes a Semgrep security scan against a public GitHub repository.
    Clones into a temporary sandbox, scans with Semgrep, normalizes findings,
    cleans up the clone, and returns normalized results.
    """
    return scan_repository(request.repository_url)