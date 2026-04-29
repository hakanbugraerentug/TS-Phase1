from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from .schemas import (
    JobStatusResponse,
    SpeakerRenameRequest,
    TranscriptListItem,
    TranscriptResponse,
    UploadMeetingResponse,
)
from .service import (
    enqueue_meeting_job,
    get_job_status,
    get_meeting_by_id,
    list_meetings_by_username,
    rename_speakers,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("/upload_meeting", response_model=UploadMeetingResponse)
async def upload_meeting(
    file: UploadFile = File(...),
    username: str = Form(...),
    language: str = Form("tr"),
) -> UploadMeetingResponse:

    try:
        content = await file.read()
        result = await enqueue_meeting_job(
            username=username,
            upload_bytes=content,
            original_filename=file.filename or "meeting.wav",
            language=language
        )
        return UploadMeetingResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@router.get("/job_status", response_model=JobStatusResponse)
async def job_status(id: str = Query(..., description="Queue job id")) -> JobStatusResponse:
    job = await get_job_status(id)
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadı")
    return JobStatusResponse(**job)


@router.get("/get_transcript", response_model=TranscriptResponse)
async def get_transcript(id: str = Query(..., description="MongoDB meeting document id")) -> TranscriptResponse:
    doc = await get_meeting_by_id(id)
    if not doc:
        raise HTTPException(status_code=404, detail="Transcript bulunamadı")
    return TranscriptResponse(**doc)


@router.get("/list_transcript", response_model=list[TranscriptListItem])
async def list_transcript(username: str = Query(...)) -> list[TranscriptListItem]:
    docs = await list_meetings_by_username(username)
    return [
        TranscriptListItem(
            id=doc["id"],
            username=doc["username"],
            original_filename=doc["original_filename"],
            status=doc["status"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            transcript_preview=(doc["transcript_text"][:200] + ("..." if len(doc["transcript_text"]) > 200 else "")),
        )
        for doc in docs
    ]


@router.post("/set_usernames_for_speakers", response_model=TranscriptResponse)
async def set_usernames_for_speakers(payload: SpeakerRenameRequest) -> TranscriptResponse:
    doc = await rename_speakers(payload.id, payload.speaker_names)
    if not doc:
        raise HTTPException(status_code=404, detail="Transcript bulunamadı")
    return TranscriptResponse(**doc)