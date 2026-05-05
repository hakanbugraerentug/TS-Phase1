from __future__ import annotations

import logging
from collections import defaultdict
from typing import Optional

from ..schemas.report import (
    CommentItem,
    GenerateReportRequest,
    GenerateReportResponse,
    BulletLine,
    ProjectBullet,
)
from ..settings import get_settings
from .llm import chat_json

logger = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────

_BASE_SYSTEM = """\
Sen kurumsal haftalık rapor asistanısın. Sana bir projeye ait haftalık kullanıcı yorumları verilecek.
Bunları aşağıdaki JSON yapısına dönüştür:

{
  "bullet0": "[Proje Adı]",
  "bullet1": ["Genel"],
  "bullet2": ["tamamlanan iş 1", "tamamlanan iş 2"],
  "bullet3": ["takip maddesi 1"]
}

KURALLAR:
- Çıktı dili TÜRKÇE olacak.
- bullet0: Proje adını köşeli parantez içinde yaz. Olduğu gibi koru, değiştirme.
- bullet1: Anlamlı bir kategori ayrımı yoksa ["Genel"] olsun.
- bullet2: Yapılan / tamamlanan işleri özetle. Kısa, resmi, rapor diline uygun.
- bullet3: Takip gerektiren maddeler, sonraki adımlar. Yoksa null.
- Kullanıcı adlarını ve tarihleri bullet metinlerine dahil ETME.
- Tekrar eden bilgileri birleştir.
- YALNIZCA JSON döndür. Açıklama, yorum veya markdown fence KULLANMA.

ÖRNEK ÇIKTI:
{
  "bullet0": "[Atlas CRM]",
  "bullet1": ["Genel"],
  "bullet2": ["Müşteri modülü tamamlandı", "Performans testleri yapıldı"],
  "bullet3": ["Entegrasyon testleri önümüzdeki haftaya planlandı"]
}
"""


def _system_with_extra_prompt(extra: Optional[str]) -> str:
    if not extra:
        return _BASE_SYSTEM
    return f"{_BASE_SYSTEM}\n\nEK TALİMATLAR:\n{extra}"


# ── Gruplama ──────────────────────────────────────────────────────────────────

def _group_comments(
    comments: list[CommentItem],
) -> dict[Optional[str], dict[str, list[CommentItem]]]:
    """
    Dönen yapı:
      {
        "Grup Adı": { "Proje A": [...], "Proje B": [...] },
        None:       { "Proje C": [...] },   # grup yoksa
      }
    """
    result: dict[Optional[str], dict[str, list[CommentItem]]] = defaultdict(lambda: defaultdict(list))
    for c in comments:
        group = c.project_group or None
        result[group][c.project_name].append(c)
    return result


# ── Tek proje için LLM çağrısı + retry ───────────────────────────────────────

async def _summarize_project(
    project_name: str,
    project_comments: list[CommentItem],
    system: str,
) -> BulletLine:
    """
    Bir proje için LLM'e gider, validate eder.
    2 retry sonrası da başarısız olursa deterministic fallback döner.
    """
    s = get_settings()
    max_attempts = s.llm_max_retries + 1

    user_payload = [
        {
            "commentId": c.comment_id,
            "date": c.date,
            "username": c.username,
            "userComment": c.user_comment,
        }
        for c in project_comments
    ]

    import json as _json
    user_msg = (
        f"Proje adı: {project_name}\n\n"
        f"Yorumlar:\n{_json.dumps(user_payload, ensure_ascii=False, indent=2)}"
    )

    last_error: Optional[str] = None

    for attempt in range(1, max_attempts + 1):
        # Retry'da hata mesajını prompt'a ekle
        current_system = system
        if last_error and attempt > 1:
            current_system = (
                f"{system}\n\n"
                f"ÖNCEKİ DENEMENİN HATASI (düzelt):\n{last_error}"
            )

        try:
            raw = await chat_json(
                system=current_system,
                user=user_msg,
                attempt_label=f"{project_name} attempt={attempt}",
            )
            # bullet0'ı her zaman biz belirleriz — LLM'e güvenmiyoruz
            raw["bullet0"] = f"[{project_name}]"
            validated = ProjectBullet.model_validate(raw)
            return BulletLine(
                bullet0=validated.bullet0,
                bullet1=validated.bullet1,
                bullet2=validated.bullet2,
                bullet3=validated.bullet3,
            )
        except (ValueError, Exception) as exc:
            last_error = str(exc)
            logger.warning(
                "Proje '%s' attempt %d/%d başarısız: %s",
                project_name, attempt, max_attempts, last_error,
            )

    # ── Deterministic fallback ────────────────────────────────────────────────
    # LLM hiç çalışmadıysa ham yorumları kırp ve döndür.
    # Rapor bozuk formatla gelsin diye ikinci LLM çağrısı yapmıyoruz.
    logger.error("Proje '%s' için tüm denemeler tükendi. Fallback kullanılıyor.", project_name)
    fallback_bullets = [
        c.user_comment[:120] for c in project_comments[:5]
    ]
    return BulletLine(
        bullet0=f"[{project_name}]",
        bullet1=["Genel"],
        bullet2=fallback_bullets if fallback_bullets else ["(Yorum işlenemedi)"],
        bullet3=None,
    )


# ── Ana pipeline ──────────────────────────────────────────────────────────────

async def run_report_pipeline(
    request: GenerateReportRequest,
) -> GenerateReportResponse:
    system = _system_with_extra_prompt(request.prompt)
    grouped = _group_comments(request.comments)

    bullet_lines: list[BulletLine] = []

    # Grupları sırayla işle: önce gruplu (group != None), sonra grupsuz
    sorted_groups = sorted(grouped.items(), key=lambda x: (x[0] is None, x[0] or ""))

    for group_name, projects in sorted_groups:
        if group_name is not None:
            # Grup header satırı — LLM çağrısı yok, tamamen deterministik
            bullet_lines.append(BulletLine(bullet0=f"[{group_name}]"))

        for project_name, comments in sorted(projects.items()):
            line = await _summarize_project(project_name, comments, system)
            # Grup varsa proje bullet0'ı girintili olsun (frontend bunu handle eder)
            if group_name is not None:
                line.bullet0 = f"  [{project_name}]"
            bullet_lines.append(line)

    return GenerateReportResponse(
        title="HAFTALIK GENEL RAPOR",
        instructions=[
            "Bilgi girişi olduğu takdirde \"(Bir bilgi girilmemiştir.)\" ifadesi silinmelidir."
        ],
        bullet_lines=bullet_lines,
    )
