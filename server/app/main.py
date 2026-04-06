from __future__ import annotations

import uvicorn
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .pipeline import build_graph
from .schemas import GenerateReportRequest, GenerateReportResponse, GenerateDocxRequest
from .docx_renderer import render_report_to_bytes
from .meeting import create_job, fetch_cached_result, get_job, process_meeting

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


@app.post(
    "/meeting/upload",
    summary="Toplantı kaydı yükle ve analiz et",
    description=(
        "MP4 dosyasını kabul eder; arka planda diarization + transkripsiyon + "
        "GPT analizi çalıştırır. Hemen bir job_id döner. "
        "Aynı (username, filename) çifti için önceden hesaplanmış sonuç varsa "
        "direkt olarak döner (cache hit)."
    ),
)
async def meeting_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    username: str = Form(...),
):
    if not file.filename or not file.filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=422, detail="Yalnızca .mp4 dosyaları kabul edilir.")

    filename = file.filename

    # Check MongoDB cache first
    cached = await fetch_cached_result(username, filename)
    if cached:
        return {
            "job_id": None,
            "status": "done",
            "cached": True,
            "transcript": cached["transcript"],
            "report": cached["report"],
        }

    # Create job and start background processing
    mp4_bytes = await file.read()
    job_id = create_job(username, filename)
    background_tasks.add_task(process_meeting, job_id, mp4_bytes, filename, username)

    return {
        "job_id": job_id,
        "status": "pending",
        "cached": False,
        "transcript": None,
        "report": None,
    }


@app.get(
    "/meeting/status/{job_id}",
    summary="İş durumunu sorgula",
    description="Yükleme sonrası dönen job_id ile işlem durumunu sorgular.",
)
async def meeting_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="İş bulunamadı.")
    return job


@app.get(
    "/meeting/result/{username}/{filename}",
    summary="MongoDB'den önbelleğe alınmış sonucu getir",
    description="Daha önce işlenmiş bir toplantı kaydının transkript ve raporunu döner.",
)
async def meeting_result(username: str, filename: str):
    cached = await fetch_cached_result(username, filename)
    if not cached:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    return {"transcript": cached["transcript"], "report": cached["report"]}


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