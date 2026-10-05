from fastapi import APIRouter
from app.schemas.repository import RepositoryRequest, RepositoryPrepareResponse
from app.services.repository_service import prepare_repository

router = APIRouter(prefix="/api/repositories", tags=["repositories"])


@router.post("/prepare", response_model=RepositoryPrepareResponse)
def prepare_repo(request: RepositoryRequest):
    """
    Validate a public GitHub URL, shallow-clone it, collect basic info,
    delete the clone, and return a summary.
    """
    return prepare_repository(request.repository_url)