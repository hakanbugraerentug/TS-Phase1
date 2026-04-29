from __future__ import annotations

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .pipeline import build_graph
from .schemas import GenerateReportRequest, GenerateReportResponse, GenerateDocxRequest
from .docx_renderer import render_report_to_bytes
from .tfs.router import router as tfs_router
from .meetings.router import router as meetings_router

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

# ── Router'ları kaydet ────────────────────────────────────
app.include_router(tfs_router)
app.include_router(meetings_router)

graph = build_graph()


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