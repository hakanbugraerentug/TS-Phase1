from __future__ import annotations

import asyncio
import contextlib
import shutil
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
from pyannote.audio import Pipeline as PyannotePipeline
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

from ..config import get_settings

_mongo_client: Optional[AsyncIOMotorClient] = None
_whisper_pipeline: Any = None
_pyannote_pipeline: Any = None
_queue: Optional[asyncio.Queue[str]] = None
_worker_tasks: list[asyncio.Task] = []
_worker_started = False

ALLOWED_EXTENSIONS = {".mp4", ".wav"}
DEFAULT_MAX_FILE_SIZE_MB = 200
DEFAULT_MERGE_GAP_SECONDS = 1.0

_queue_lock = asyncio.Lock()

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _overlap(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    return max(0.0, min(a_end, b_end) - max(a_start, b_start))

def _get_db_collection(name: str) -> AsyncIOMotorCollection:
    global _mongo_client
    settings = get_settings()
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(settings.mongodb_url)
    db = _mongo_client[settings.mongodb_db]
    return db[name]


def get_meetings_collection() -> AsyncIOMotorCollection:
    return _get_db_collection("meetings")


def get_meeting_jobs_collection() -> AsyncIOMotorCollection:
    return _get_db_collection("meeting_jobs")


async def ensure_indexes() -> None:
    await get_meetings_collection().create_index([("username", 1), ("created_at", -1)])
    await get_meeting_jobs_collection().create_index([("status", 1), ("created_at", 1)])


async def startup_queue() -> None:
    global _queue, _worker_started, _worker_tasks
    async with _queue_lock:
        if _worker_started:
            return
        settings = get_settings()
        _queue = asyncio.Queue()
        worker_count = max(1, int(getattr(settings, "meeting_worker_count", 1)))
        _worker_tasks = [asyncio.create_task(_worker_loop(i + 1)) for i in range(worker_count)]
        _worker_started = True
        await ensure_indexes()


async def shutdown_queue() -> None:
    global _queue, _worker_tasks, _worker_started, _mongo_client
    if _queue is not None:
        for _ in _worker_tasks:
            await _queue.put("__STOP__")
    for task in _worker_tasks:
        with contextlib.suppress(asyncio.CancelledError):
            await task
    _worker_tasks = []
    _queue = None
    _worker_started = False
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None


async def enqueue_meeting_job(
    *,
    username: str,
    upload_bytes: bytes,
    original_filename: str,
    language: str,
) -> Dict[str, Any]:
    settings = get_settings()
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Yalnızca .mp4 veya .wav dosyaları kabul edilir.")

    max_bytes = int(getattr(settings, "max_file_size_mb", DEFAULT_MAX_FILE_SIZE_MB)) * 1024 * 1024
    if len(upload_bytes) > max_bytes:
        raise ValueError(f"Dosya boyutu sınırı aşıldı. Maksimum: {getattr(settings, 'max_file_size_mb', DEFAULT_MAX_FILE_SIZE_MB)} MB")

    temp_root = Path(getattr(settings, "temp_dir", "/tmp/meetings")).expanduser().resolve()
    temp_root.mkdir(parents=True, exist_ok=True)
    job_dir = Path(tempfile.mkdtemp(prefix="meeting_", dir=str(temp_root)))
    input_path = job_dir / original_filename
    input_path.write_bytes(upload_bytes)

    job_id = str(uuid.uuid4())
    jobs_col = get_meeting_jobs_collection()
    created_at = _utcnow()
    await jobs_col.insert_one(
        {
            "_id": job_id,
            "status": "queued",
            "username": username,
            "original_filename": original_filename,
            "input_path": str(input_path),
            "job_dir": str(job_dir),
            "language": language or "tr",
            "created_at": created_at,
            "started_at": None,
            "finished_at": None,
            "error": None,
            "meeting_id": None,
        }
    )

    if _queue is None or not _worker_started:
        await startup_queue()

    if _queue is None:
        raise RuntimeError("Meeting queue başlatılmadı")
    queue_position = _queue.qsize() + 1
    await _queue.put(job_id)
    return {"job_id": job_id, "status": "queued", "queue_position": queue_position}


async def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    job = await get_meeting_jobs_collection().find_one({"_id": job_id})
    if not job:
        return None
    return _serialize_job(job)


async def get_meeting_by_id(meeting_id: str) -> Optional[Dict[str, Any]]:
    if not ObjectId.is_valid(meeting_id):
        return None
    doc = await get_meetings_collection().find_one({"_id": ObjectId(meeting_id)})
    if not doc:
        return None
    return _serialize_meeting(doc)


async def list_meetings_by_username(username: str) -> List[Dict[str, Any]]:
    cursor = get_meetings_collection().find({"username": username}).sort("created_at", -1)
    docs = await cursor.to_list(length=500)
    return [_serialize_meeting(doc) for doc in docs]


async def rename_speakers(meeting_id: str, speaker_names: Dict[str, Optional[str]]) -> Optional[Dict[str, Any]]:
    if not ObjectId.is_valid(meeting_id):
        return None
    col = get_meetings_collection()
    doc = await col.find_one({"_id": ObjectId(meeting_id)})
    if not doc:
        return None

    aliases = dict(doc.get("speaker_aliases") or {})
    aliases.update(speaker_names)

    items = doc.get("transcript_items") or []
    updated_items: List[Dict[str, str]] = []
    for item in items:
        original_speaker = item["speaker"]
        alias = aliases.get(original_speaker)
        updated_items.append(
            {
                "speaker": alias if alias else original_speaker,
                "text": item["text"],
            }
        )

    transcript_text = "\n".join(f"{item['speaker']}: {item['text']}" for item in updated_items)

    await col.update_one(
        {"_id": ObjectId(meeting_id)},
        {
            "$set": {
                "speaker_aliases": aliases,
                "transcript_items": updated_items,
                "transcript_text": transcript_text,
                "updated_at": _utcnow(),
            }
        },
    )
    refreshed = await col.find_one({"_id": ObjectId(meeting_id)})
    return _serialize_meeting(refreshed) if refreshed else None


async def _worker_loop(worker_id: int) -> None:
    assert _queue is not None
    while True:
        job_id = await _queue.get()
        try:
            if job_id == "__STOP__":
                return
            await _process_job(job_id, worker_id)
        finally:
            _queue.task_done()


async def _process_job(job_id: str, worker_id: int) -> None:
    jobs_col = get_meeting_jobs_collection()
    job = await jobs_col.find_one({"_id": job_id})
    if not job:
        return

    await jobs_col.update_one(
        {"_id": job_id},
        {
            "$set": {
                "status": "processing",
                "started_at": _utcnow(),
                "worker_id": worker_id,
                "error": None,
            }
        },
    )

    job_dir = Path(job["job_dir"])
    try:
        meeting_doc = await asyncio.to_thread(_process_meeting_sync, job)
        result = await get_meetings_collection().insert_one(meeting_doc)
        meeting_id = str(result.inserted_id)
        await jobs_col.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "done",
                    "finished_at": _utcnow(),
                    "meeting_id": meeting_id,
                }
            },
        )
    except Exception as exc:
        await jobs_col.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "finished_at": _utcnow(),
                    "error": str(exc),
                }
            },
        )
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


def _process_meeting_sync(job: Dict[str, Any]) -> Dict[str, Any]:
    input_path = Path(job["input_path"])
    ext = input_path.suffix.lower()
    wav_path = input_path if ext == ".wav" else input_path.with_suffix(".wav")

    if ext == ".mp4":
        _convert_mp4_to_wav_moviepy(input_path, wav_path)
        _convert_to_clean_wav_ffmpeg(wav_path, wav_path)
    else:
        cleaned_wav = input_path.with_name(f"cleaned_{input_path.name}")
        _convert_to_clean_wav_ffmpeg(input_path, cleaned_wav)
        wav_path = cleaned_wav

    asr_chunks = _run_whisper_local(wav_path,  
                                    language=job.get("language") or "tr")
    speaker_turns = _run_diarization_local(
        wav_path    )
    dialogues = _align_and_merge(asr_chunks, speaker_turns)
    transcript_text = "\n".join(f"{d['speaker']}: {d['text']}" for d in dialogues)
    now = _utcnow()

    return {
        "username": job["username"],
        "original_filename": job["original_filename"],
        "status": "done",
        "transcript_items": dialogues,
        "transcript_text": transcript_text,
        "speaker_aliases": {},
        "created_at": now,
        "updated_at": now,
    }


def _convert_mp4_to_wav_moviepy(mp4_path: Path, wav_path: Path) -> None:
    from moviepy import VideoFileClip

    video = VideoFileClip(str(mp4_path))
    try:
        if video.audio is None:
            raise RuntimeError("Video içinde ses akışı bulunamadı.")
        video.audio.write_audiofile(str(wav_path), logger=None)
    finally:
        with contextlib.suppress(Exception):
            if video.audio is not None:
                video.audio.close()
        with contextlib.suppress(Exception):
            video.close()


def _convert_to_clean_wav_ffmpeg(src: Path, dst: Path) -> None:
    temp_dst = dst.with_name(f"tmp_{dst.name}")
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(src),
        "-ac",
        "1",
        "-ar",
        "16000",
        "-vn",
        "-c:a",
        "pcm_s16le",
        str(temp_dst),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    temp_dst.replace(dst)


def _run_whisper_local(wav_path: Path, *, language: str) -> List[Dict[str, Any]]:
    asr_pipe = _get_whisper_pipeline()
    result = asr_pipe(
        str(wav_path),
        return_timestamps=True,
        generate_kwargs={
            "language": language,
            "task": "transcribe",
            "temperature": 0.0,
            "no_repeat_ngram_size": 3,
        },
    )
    chunks: List[Dict[str, Any]] = []
    for chunk in result.get("chunks", []):
        ts = chunk.get("timestamp")
        if not ts:
            continue
        start, end = ts
        if start is None or end is None:
            continue
        text = (chunk.get("text") or "").strip()
        if not text:
            continue
        chunks.append({"start": float(start), "end": float(end), "text": text})
    return chunks


def _get_whisper_pipeline() -> Any:
    global _whisper_pipeline
    if _whisper_pipeline is None:
        settings = get_settings()
        model_dir = Path(settings.whisper_local_model_dir).expanduser().resolve()
        if not model_dir.exists():
            raise RuntimeError(f"Whisper model klasörü bulunamadı: {model_dir}")
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            str(model_dir), local_files_only=True, torch_dtype=torch_dtype
        )
        processor = AutoProcessor.from_pretrained(str(model_dir), local_files_only=True)
        _whisper_pipeline = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            torch_dtype=torch_dtype,
            device=0 if torch.cuda.is_available() else -1,
        )
    return _whisper_pipeline


def _get_pyannote_pipeline() -> Any:
    global _pyannote_pipeline
    if _pyannote_pipeline is None:
        settings = get_settings()
        config_path = Path(settings.pyannote_diarization_config).expanduser().resolve()
        if not config_path.exists():
            raise RuntimeError(f"Pyannote config bulunamadı: {config_path}")
        _pyannote_pipeline = PyannotePipeline.from_pretrained(config_path)
        if torch.cuda.is_available():
            _pyannote_pipeline.to(torch.device("cuda"))
    return _pyannote_pipeline


def _run_diarization_local(
    wav_path: Path,
) -> List[Dict[str, Any]]:
    diar_pipeline = _get_pyannote_pipeline()
    diar_kwargs: Dict[str, Any] = {}

    diarization = diar_pipeline(str(wav_path), **diar_kwargs)
    turns: List[Dict[str, Any]] = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        duration = float(turn.end - turn.start)
        if duration < 0.7:
            continue
        turns.append(
            {"start": float(turn.start), "end": float(turn.end), "speaker": speaker}
        )
    return _merge_speaker_turns(turns, gap=0.4)


def _merge_speaker_turns(turns: List[Dict[str, Any]], gap: float) -> List[Dict[str, Any]]:
    if not turns:
        return []
    merged = [turns[0].copy()]
    for turn in turns[1:]:
        prev = merged[-1]
        if turn["speaker"] == prev["speaker"] and turn["start"] - prev["end"] <= gap:
            prev["end"] = turn["end"]
        else:
            merged.append(turn.copy())
    return merged


def _align_and_merge(asr_chunks: List[Dict[str, Any]], speaker_turns: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    mapped: List[Dict[str, Any]] = []
    for chunk in asr_chunks:
        best_speaker = "UNKNOWN"
        best_overlap = -1.0
        for turn in speaker_turns:
            ov = _overlap(chunk["start"], chunk["end"], turn["start"], turn["end"])
            if ov > best_overlap:
                best_overlap = ov
                best_speaker = turn["speaker"]
        mapped.append(
            {
                "start": chunk["start"],
                "end": chunk["end"],
                "speaker": best_speaker,
                "text": chunk["text"],
            }
        )

    speaker_map: Dict[str, str] = {}
    speaker_idx = 1
    for item in mapped:
        spk = item["speaker"]
        if spk not in speaker_map:
            speaker_map[spk] = f"Speaker {speaker_idx}"
            speaker_idx += 1
        item["speaker"] = speaker_map[spk]

    dialogues: List[Dict[str, str]] = []
    for item in mapped:
        if not dialogues:
            dialogues.append({"speaker": item["speaker"], "text": item["text"], "start": item["start"], "end": item["end"]})
            continue
        prev = dialogues[-1]
        if prev["speaker"] == item["speaker"] and item["start"] - prev["end"] < DEFAULT_MERGE_GAP_SECONDS:
            prev["text"] += " " + item["text"]
            prev["end"] = item["end"]
        else:
            dialogues.append({"speaker": item["speaker"], "text": item["text"], "start": item["start"], "end": item["end"]})

    return [{"speaker": d["speaker"], "text": d["text"]} for d in dialogues]


def _serialize_job(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "job_id": doc["_id"],
        "status": doc["status"],
        "username": doc["username"],
        "original_filename": doc["original_filename"],
        "created_at": doc["created_at"],
        "started_at": doc.get("started_at"),
        "finished_at": doc.get("finished_at"),
        "error": doc.get("error"),
        "meeting_id": doc.get("meeting_id"),
    }


def _serialize_meeting(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "username": doc["username"],
        "original_filename": doc["original_filename"],
        "status": doc["status"],
        "transcript_items": doc.get("transcript_items") or [],
        "transcript_text": doc.get("transcript_text") or "",
        "speaker_aliases": doc.get("speaker_aliases") or {},
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }
