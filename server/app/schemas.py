from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Request ──────────────────────────────────────────────
class Comment(BaseModel):
    commentId: Optional[str] = None
    date: Optional[str] = None
    username: Optional[str] = None
    projectName: str
    userComment: str


class GenerateReportRequest(BaseModel):
    comments: List[Comment]
    prompt: Optional[str] = Field(
        default=None,
        description="Opsiyonel ek talimat. Verilirse LLM system prompt'una eklenir.",
    )


# ── Response ─────────────────────────────────────────────
class BulletLine(BaseModel):
    bullet0: str = Field(description="Proje adı köşeli parantez formatında, ör. [Atlas CRM]")
    bullet1: Optional[List[str]] = Field(default=None)
    bullet2: Optional[List[str]] = Field(default=None)
    bullet3: Optional[List[str]] = Field(default=None)

    @field_validator("bullet0")
    @classmethod
    def validate_bullet0(cls, v: str) -> str:
        v = v.strip()
        if not (v.startswith("[") and v.endswith("]")):
            raise ValueError("bullet0 must be bracketed like [Project Name]")
        return v

    @field_validator("bullet1", "bullet2", "bullet3")
    @classmethod
    def clean_lists(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = [str(item).strip() for item in v if item is not None and str(item).strip()]
        return cleaned or None


class TraceItem(BaseModel):
    project: str
    bullet_field: Literal["bullet2", "bullet3"]
    text: str
    sources: List[str]


class GenerateReportResponse(BaseModel):
    title: str
    instructions: List[str]
    bullet_lines: List[BulletLine]
    traceability: List[TraceItem]
    source_map: Dict[str, Dict[str, Any]]


# ── Docx Request ─────────────────────────────────────────
class GenerateDocxRequest(BaseModel):
    bullet_lines: List[BulletLine]


# ── Manager Merge Request ─────────────────────────────────
class SubordinateReport(BaseModel):
    username: str = Field(description="Ekip liderinin kullanıcı adı")
    bullet_lines: List[BulletLine]


class MergeReportsRequest(BaseModel):
    subordinate_reports: List[SubordinateReport] = Field(
        description="Birleştirilecek astların raporları"
    )
    prompt: Optional[str] = Field(
        default=None,
        description="Opsiyonel ek talimat. Verilirse LLM system prompt'una eklenir.",
    )