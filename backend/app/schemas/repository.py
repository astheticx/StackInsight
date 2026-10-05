from pydantic import BaseModel, field_validator, HttpUrl
from typing import List
import re

# --------------------------------------------------------------------------- #
# Request
# --------------------------------------------------------------------------- #

GITHUB_REPO_RE = re.compile(
    r"^https://github\.com/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+?)(?:\.git)?$"
)


class RepositoryRequest(BaseModel):
    repository_url: str

    @field_validator("repository_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("https://"):
            raise ValueError("URL must use HTTPS.")
        if not re.match(r"https://github\.com/", v):
            raise ValueError("URL must point to github.com.")
        if not GITHUB_REPO_RE.match(v):
            raise ValueError(
                "URL must be in the form https://github.com/<owner>/<repo>"
            )
        return v


# --------------------------------------------------------------------------- #
# Response
# --------------------------------------------------------------------------- #


class RepositoryInfo(BaseModel):
    owner: str
    name: str
    url: str


class RepositoryPrepareResponse(BaseModel):
    status: str
    repository: RepositoryInfo
    total_files: int
    detected_languages: List[str]