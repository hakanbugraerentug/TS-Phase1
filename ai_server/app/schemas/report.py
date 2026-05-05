from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── Request ──────────────────────────────────────────────────────────────────

class CommentItem(BaseModel):
    """Tek bir kullanıcı yorumu."""
    comment_id: str = Field(alias="commentId")
    date: str
    username: str
    project_name: str = Field(alias="projectName")
    # Opsiyonel — varsa projeler bu grup altında toplanır
    project_group: Optional[str] = Field(default=None, alias="projectGroup")
    user_comment: str = Field(alias="userComment")

    model_config = {"populate_by_name": True}


class GenerateReportRequest(BaseModel):
    comments: list[CommentItem]
    prompt: Optional[str] = ""


# ── LLM'den beklenen proje çıktısı (internal) ────────────────────────────────

class ProjectBullet(BaseModel):
    """
    LLM'in her proje için döndürdüğü yapı.

    bullet0 : [Proje Adı]
    bullet1 : Kategori listesi — genellikle ["Genel"]
    bullet2 : Tamamlanan / yapılan işler
    bullet3 : Takip maddeleri, sonraki adımlar (opsiyonel)
    """
    bullet0: str
    bullet1: Optional[list[str]] = None
    bullet2: Optional[list[str]] = None
    bullet3: Optional[list[str]] = None


# ── Response ─────────────────────────────────────────────────────────────────

class BulletLine(BaseModel):
    """Frontend'e döndürülen tek bir rapor satırı."""
    bullet0: Optional[str] = None
    bullet1: Optional[list[str]] = None
    bullet2: Optional[list[str]] = None
    bullet3: Optional[list[str]] = None


class GenerateReportResponse(BaseModel):
    title: str
    instructions: list[str]
    bullet_lines: list[BulletLine]
