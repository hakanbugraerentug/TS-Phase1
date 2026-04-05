from __future__ import annotations

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .pipeline import build_graph, merge_subordinate_reports
from .schemas import GenerateReportRequest, GenerateReportResponse, GenerateDocxRequest, MergeReportsRequest
from .docx_renderer import render_report_to_bytes
from .users import router as users_router

settings = get_settings()

app = FastAPI(
    title=settings.app_title,
    description="Kullanıcı yorumlarından haftalık rapor üreten API.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graph = build_graph()

app.include_router(users_router)


@app.post(
    "/generate_report",
    response_model=GenerateReportResponse,
    summary="Haftalık rapor üret",
    description=(
        "Yorumları ve opsiyonel ek promptu alır, LLM pipeline'ından geçirir, "
        "bullet-line formatında rapor + traceability döner."
    ),
)
async def generate_report(payload: GenerateReportRequest) -> GenerateReportResponse:
    comments_raw = [c.model_dump() for c in payload.comments]

    if not comments_raw:
        raise HTTPException(status_code=422, detail="En az 1 yorum gerekli.")

    try:
        result = graph.invoke(
            {
                "raw_comments": comments_raw,
                "custom_prompt": payload.prompt,
            }
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline hatası: {exc}") from exc

    output = result.get("validated_report") or result.get("report_dict")
    if not output:
        raise HTTPException(status_code=500, detail="Rapor üretilemedi.")

    return GenerateReportResponse.model_validate(output)


@app.post(
    "/merge_reports",
    response_model=GenerateReportResponse,
    summary="Yönetici raporu birleştir (Müdür ve üstü)",
    description=(
        "Müdür ve üstü yöneticiler için kullanılır. "
        "Astlarının (ekip liderlerinin) bullet_lines listelerini alır; "
        "farklı projeleri doğrudan birleştirir, aynı proje adına sahip "
        "bullet'ları LLM ile özetleyerek tek rapor üretir."
    ),
)
async def merge_reports(payload: MergeReportsRequest) -> GenerateReportResponse:
    if not payload.subordinate_reports:
        raise HTTPException(status_code=422, detail="En az 1 astın raporu gerekli.")

    all_empty = all(not r.bullet_lines for r in payload.subordinate_reports)
    if all_empty:
        raise HTTPException(status_code=422, detail="Raporlarda bullet_lines bulunamadı.")

    try:
        reports_raw = [
            {
                "username": r.username,
                "bullet_lines": [bl.model_dump() for bl in r.bullet_lines],
            }
            for r in payload.subordinate_reports
        ]
        merged = merge_subordinate_reports(reports_raw, payload.prompt)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Birleştirme hatası: {exc}") from exc

    try:
        return GenerateReportResponse.model_validate(merged)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Doğrulama hatası: {exc}") from exc


@app.post(
    "/generate_docx",
    summary="Bullet JSON'dan DOCX üret",
    description="generate_report çıktısındaki bullet_lines listesini alır, formatlı DOCX dosyası döner.",
    response_class=Response,
    responses={
        200: {
            "content": {
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {}
            },
            "description": "DOCX dosyası",
        }
    },
)
async def generate_docx(payload: GenerateDocxRequest) -> Response:
    if not payload.bullet_lines:
        raise HTTPException(status_code=422, detail="En az 1 bullet_line gerekli.")

    try:
        lines_raw = [bl.model_dump() for bl in payload.bullet_lines]
        docx_bytes = render_report_to_bytes(lines_raw)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Logo dosyası bulunamadı: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"DOCX oluşturma hatası: {exc}",
        ) from exc

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": 'attachment; filename="HAFTALIK_GENEL_RAPOR.docx"'
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )