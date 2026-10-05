"""
repository_service.py
Validates a GitHub URL, shallow-clones it into a temp directory,
collects basic repo info, then cleans up the clone.
"""

import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple

from fastapi import HTTPException

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

GITHUB_REPO_RE = re.compile(
    r"^https://github\.com/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+?)(?:\.git)?$"
)

CLONE_TIMEOUT_SECONDS = 60  # shallow clone should be fast

# Extension → language display name
EXT_LANGUAGE_MAP: Dict[str, str] = {
    ".py":    "Python",
    ".js":    "JavaScript",
    ".jsx":   "JavaScript/React",
    ".ts":    "TypeScript",
    ".tsx":   "TypeScript/React",
    ".java":  "Java",
    ".kt":    "Kotlin",
    ".go":    "Go",
    ".rb":    "Ruby",
    ".rs":    "Rust",
    ".cpp":   "C++",
    ".cc":    "C++",
    ".c":     "C",
    ".h":     "C/C++ Header",
    ".cs":    "C#",
    ".php":   "PHP",
    ".swift": "Swift",
    ".html":  "HTML",
    ".css":   "CSS",
    ".scss":  "CSS/SCSS",
    ".json":  "JSON",
    ".yml":   "YAML",
    ".yaml":  "YAML",
    ".toml":  "TOML",
    ".xml":   "XML",
    ".md":    "Markdown",
    ".sh":    "Shell",
    ".bash":  "Shell",
    ".tf":    "Terraform",
    ".hcl":   "HCL",
    ".sql":   "SQL",
    ".dockerfile": "Dockerfile",
}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _parse_github_url(url: str) -> Tuple[str, str, str]:
    """Return (owner, repo_name, canonical_url) or raise HTTPException."""
    m = GITHUB_REPO_RE.match(url.strip())
    if not m:
        raise HTTPException(status_code=422, detail="Invalid GitHub repository URL.")
    owner = m.group("owner")
    repo  = m.group("repo")
    canonical = f"https://github.com/{owner}/{repo}"
    return owner, repo, canonical


def _collect_repo_info(clone_path: Path) -> Tuple[int, List[str]]:
    """
    Walk the cloned directory (excluding .git), count files,
    and detect languages from file extensions.
    """
    total_files = 0
    seen_languages: dict[str, str] = {}   # ext -> display name (ordered set)

    for item in clone_path.rglob("*"):
        # Skip the .git directory
        if ".git" in item.parts:
            continue
        if item.is_file():
            total_files += 1
            ext = item.suffix.lower()
            # Handle Dockerfile with no extension
            if item.name.lower() == "dockerfile" and ext == "":
                ext = ".dockerfile"
            if ext in EXT_LANGUAGE_MAP and ext not in seen_languages:
                seen_languages[ext] = EXT_LANGUAGE_MAP[ext]

    # Deduplicate display names (e.g. .yml and .yaml both map to "YAML")
    detected = list(dict.fromkeys(seen_languages.values()))
    return total_files, detected


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def prepare_repository(repository_url: str) -> dict:
    """
    Clone a public GitHub repo shallowly, gather basic info, then delete it.
    Returns a dict matching RepositoryPrepareResponse.
    """
    owner, repo_name, canonical_url = _parse_github_url(repository_url)

    # Confirm git is available
    try:
        subprocess.run(
            ["git", "--version"],
            check=True,
            capture_output=True,
            timeout=10,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Git is not installed or not available on PATH.",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Git command timed out.")

    tmp_dir = tempfile.mkdtemp(prefix="stackinsight_")
    clone_path = Path(tmp_dir) / repo_name

    try:
        result = subprocess.run(
            # shell=False (default) — argument list, no shell injection risk
            ["git", "clone", "--depth", "1", canonical_url, str(clone_path)],
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

        if not clone_path.exists():
            raise HTTPException(
                status_code=502,
                detail="Clone appeared to succeed but the directory was not created.",
            )

        total_files, detected_languages = _collect_repo_info(clone_path)

    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail=f"Cloning timed out after {CLONE_TIMEOUT_SECONDS} seconds.",
        )
    finally:
        # Always clean up — even on error
        shutil.rmtree(tmp_dir, ignore_errors=True)

    return {
        "status": "ready",
        "repository": {
            "owner": owner,
            "name": repo_name,
            "url": canonical_url,
        },
        "total_files": total_files,
        "detected_languages": detected_languages,
    }