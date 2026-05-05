from fastapi import APIRouter, HTTPException
from ..schemas.report import GenerateReportRequest, GenerateReportResponse
from ..services.pipeline import run_report_pipeline
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate_report", response_model=GenerateReportResponse)
async def generate_report(request: GenerateReportRequest) -> GenerateReportResponse:
    if not request.comments:
        raise HTTPException(status_code=422, detail="En az bir yorum gönderilmelidir.")
    try:
        return await run_report_pipeline(request)
    except Exception as exc:
        logger.exception("generate_report beklenmeyen hata: %s", exc)
        raise HTTPException(status_code=500, detail="Rapor oluşturulurken sunucu hatası oluştu.")
