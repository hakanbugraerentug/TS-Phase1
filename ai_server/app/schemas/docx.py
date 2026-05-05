from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class BulletLine(BaseModel):
    bullet0: Optional[str] = None
    bullet1: Optional[list[str]] = None
    bullet2: Optional[list[str]] = None
    bullet3: Optional[list[str]] = None


class GenerateDocxRequest(BaseModel):
    bullet_lines: list[BulletLine]
    title: Optional[str] = "HAFTALIK GENEL RAPOR"
