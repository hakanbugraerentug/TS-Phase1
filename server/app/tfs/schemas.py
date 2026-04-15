"""
TFS endpoint'leri için Pydantic request/response şemaları.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Work Item Create ──────────────────────────────────────

class CreateWorkItemRequest(BaseModel):
    work_item_type: str = Field(
        default="Task",
        description="TFS work item tipi, ör. 'Task', 'Bug', 'User Story'",
        examples=["Task", "Bug", "User Story"],
    )
    title: str = Field(description="Work item başlığı")
    description: Optional[str] = Field(default=None, description="HTML veya düz metin açıklama")
    assigned_to: Optional[str] = Field(
        default=None,
        description="Atanacak kişi (display name veya e-posta)",
    )
    tags: Optional[str] = Field(
        default=None,
        description="Noktalı virgülle ayrılmış tag listesi, ör. 'frontend; urgent'",
    )
    priority: Optional[int] = Field(
        default=None,
        ge=1,
        le=4,
        description="Öncelik 1 (en yüksek) – 4 (en düşük)",
    )
    extra_fields: Optional[Dict[str, Any]] = Field(
        default=None,
        description=(
            "Ek TFS field'ları. Key olarak tam alan adı kullanın, "
            "ör. {'System.AreaPath': 'TeamSync\\\\Backend'}"
        ),
    )


class WorkItemFieldsResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    state: Optional[str] = None
    assigned_to: Optional[str] = None
    work_item_type: Optional[str] = None
    created_date: Optional[str] = None
    changed_date: Optional[str] = None
    created_by: Optional[str] = None
    tags: Optional[str] = None
    area_path: Optional[str] = None
    iteration_path: Optional[str] = None
    priority: Optional[int] = None
    url: Optional[str] = None

    @classmethod
    def from_tfs(cls, raw: Dict[str, Any]) -> "WorkItemFieldsResponse":
        f = raw.get("fields", {})

        def _display(val: Any) -> Optional[str]:
            """AssignedTo gibi obje veya string olabilir."""
            if val is None:
                return None
            if isinstance(val, dict):
                return val.get("displayName") or val.get("uniqueName") or str(val)
            return str(val)

        return cls(
            id=raw["id"],
            title=f.get("System.Title", ""),
            description=f.get("System.Description"),
            state=f.get("System.State"),
            assigned_to=_display(f.get("System.AssignedTo")),
            work_item_type=f.get("System.WorkItemType"),
            created_date=f.get("System.CreatedDate"),
            changed_date=f.get("System.ChangedDate"),
            created_by=_display(f.get("System.CreatedBy")),
            tags=f.get("System.Tags"),
            area_path=f.get("System.AreaPath"),
            iteration_path=f.get("System.IterationPath"),
            priority=f.get("Microsoft.VSTS.Common.Priority"),
            url=raw.get("url"),
        )


class CreateWorkItemResponse(BaseModel):
    id: int
    url: str
    title: str
    state: Optional[str] = None
    work_item_type: Optional[str] = None


class WorkItemListResponse(BaseModel):
    count: int
    items: List[WorkItemFieldsResponse]


# ── Commits ───────────────────────────────────────────────

class CommitAuthor(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    date: Optional[str] = None


class CommitResponse(BaseModel):
    commit_id: str
    message: str
    author: CommitAuthor
    repo_name: str
    project_name: str
    url: Optional[str] = None

    @classmethod
    def from_tfs(cls, raw: Dict[str, Any]) -> "CommitResponse":
        author_raw = raw.get("author") or raw.get("committer") or {}
        return cls(
            commit_id=raw.get("commitId", ""),
            message=(raw.get("comment") or "").strip(),
            author=CommitAuthor(
                name=author_raw.get("name"),
                email=author_raw.get("email"),
                date=author_raw.get("date"),
            ),
            repo_name=raw.get("_repo_name", ""),
            project_name=raw.get("_project_name", ""),
            url=raw.get("remoteUrl") or raw.get("url"),
        )


class CommitListResponse(BaseModel):
    count: int
    commits: List[CommitResponse]