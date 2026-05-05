from __future__ import annotations

import io
from typing import Optional

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

from ..schemas.docx import BulletLine


# Kurumsal renk paleti
_COLOR_TITLE = RGBColor(0x1F, 0x39, 0x64)   # koyu lacivert
_COLOR_GROUP = RGBColor(0x1F, 0x39, 0x64)   # grup header
_COLOR_PROJECT = RGBColor(0x2E, 0x75, 0xB6) # proje header (mavi)
_COLOR_BODY = RGBColor(0x00, 0x00, 0x00)    # normal metin


def _is_group_line(bullet0: Optional[str]) -> bool:
    """Girintisiz [Başlık] → grup satırı."""
    return bool(bullet0 and not bullet0.startswith("  ") and not _is_project_line(bullet0))


def _is_project_line(bullet0: Optional[str]) -> bool:
    """  [Proje] → grup altındaki proje satırı (2 boşlukla başlar)."""
    return bool(bullet0 and bullet0.startswith("  "))


def build_docx(lines: list[BulletLine], title: str) -> bytes:
    doc = Document()

    # ── Sayfa kenar boşlukları ────────────────────────────────────────────────
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1.25)
        section.right_margin = Inches(1.25)

    # ── Başlık ────────────────────────────────────────────────────────────────
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title_para.add_run(title)
    run.bold = True
    run.font.size = Pt(16)
    run.font.color.rgb = _COLOR_TITLE
    doc.add_paragraph()  # boşluk

    # ── Bullet satırları ──────────────────────────────────────────────────────
    for line in lines:
        b0 = line.bullet0 or ""
        label = b0.strip()  # girintisiz hali

        if not label:
            continue

        # Grup header (büyük başlık, koyu lacivert, alt çizgili)
        if _is_group_line(b0) and not line.bullet2 and not line.bullet3:
            p = doc.add_paragraph()
            run = p.add_run(label)
            run.bold = True
            run.underline = True
            run.font.size = Pt(12)
            run.font.color.rgb = _COLOR_GROUP
            continue

        # Proje header — grup altındaysa girintili, değilse normal
        is_nested = _is_project_line(b0)
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.3) if is_nested else Inches(0)
        run = p.add_run(label)
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = _COLOR_PROJECT

        base_indent = Inches(0.6) if is_nested else Inches(0.3)

        # bullet1 — kategori (italic, gri)
        for item in (line.bullet1 or []):
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.left_indent = base_indent
            run = p.add_run(item)
            run.italic = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0x59, 0x56, 0x59)

        # bullet2 — yapılan işler
        for item in (line.bullet2 or []):
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.left_indent = base_indent + Inches(0.2)
            run = p.add_run(item)
            run.font.size = Pt(10)
            run.font.color.rgb = _COLOR_BODY

        # bullet3 — takip maddeleri (koyu sarı-turuncu ile)
        for item in (line.bullet3 or []):
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.left_indent = base_indent + Inches(0.2)
            run = p.add_run(f"[Takip] {item}")
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xC0, 0x6B, 0x00)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
