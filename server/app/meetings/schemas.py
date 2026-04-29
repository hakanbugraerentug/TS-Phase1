from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class UploadMeetingResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    queue_position: Optional[int] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    username: str
    original_filename: str
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error: Optional[str] = None
    meeting_id: Optional[str] = None


class SpeakerRenameRequest(BaseModel):
    id: str = Field(description="MongoDB meeting document id")
    speaker_names: Dict[str, Optional[str]] = Field(
        description='Örnek: {"Speaker 1": "Ahmet Yılmaz", "Speaker 2": null}'
    )

    @field_validator("speaker_names")
    @classmethod
    def validate_speaker_names(cls, value: Dict[str, Optional[str]]) -> Dict[str, Optional[str]]:
        if not value:
            raise ValueError("speaker_names boş olamaz")
        return value


class TranscriptItem(BaseModel):
    speaker: str
    text: str


class TranscriptResponse(BaseModel):
    id: str
    username: str
    original_filename: str
    transcript_text: str
    transcript_items: List[TranscriptItem]
    speaker_aliases: Dict[str, Optional[str]]
    status: str
    created_at: datetime
    updated_at: datetime


class TranscriptListItem(BaseModel):
    id: str
    username: str
    original_filename: str
    status: str
    created_at: datetime
    updated_at: datetime
    transcript_preview: str
