from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..schemas.docx import GenerateDocxRequest
from ..services.docx_builder import build_docx
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.post("/generate_docx")
async def generate_docx(request: GenerateDocxRequest) -> Response:
    if not request.bullet_lines:
        raise HTTPException(status_code=422, detail="En az bir bullet_line gönderilmelidir.")
    try:
        content = build_docx(request.bullet_lines, request.title or "HAFTALIK GENEL RAPOR")
        return Response(
            content=content,
            media_type=DOCX_MIME,
            headers={"Content-Disposition": "attachment; filename=haftalik_rapor.docx"},
        )
    except Exception as exc:
        logger.exception("generate_docx beklenmeyen hata: %s", exc)
        raise HTTPException(status_code=500, detail="Docx oluşturulurken sunucu hatası oluştu.")
