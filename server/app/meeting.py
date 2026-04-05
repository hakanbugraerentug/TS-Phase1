from __future__ import annotations

import asyncio
import os
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorClient

from .config import get_settings

# ── In-memory job tracker ─────────────────────────────────
_jobs: Dict[str, Dict[str, Any]] = {}

# ── Module-level singletons (loaded lazily) ───────────────
_mongo_client: Optional[AsyncIOMotorClient] = None
_pyannote_pipeline: Any = None
_whisper_model: Any = None


# ── MongoDB helpers ───────────────────────────────────────

def _get_collection():
    global _mongo_client
    if _mongo_client is None:
        settings = get_settings()
        _mongo_client = AsyncIOMotorClient(settings.mongodb_url)
    db = _mongo_client[get_settings().mongodb_db]
    return db["meeting_records"]


async def fetch_cached_result(username: str, filename: str) -> Optional[Dict[str, Any]]:
    col = _get_collection()
    doc = await col.find_one({"username": username, "filename": filename})
    if doc:
        return {"transcript": doc["transcript"], "report": doc["report"]}
    return None


async def save_result(username: str, filename: str, transcript: str, report: str) -> None:
    col = _get_collection()
    await col.update_one(
        {"username": username, "filename": filename},
        {
            "$set": {
                "username": username,
                "filename": filename,
                "transcript": transcript,
                "report": report,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )


# ── Job helpers ───────────────────────────────────────────

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    return _jobs.get(job_id)


def create_job(username: str, filename: str) -> str:
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "username": username,
        "filename": filename,
        "transcript": None,
        "report": None,
        "error": None,
    }
    return job_id


# ── Audio / ML processing helpers ────────────────────────

def _convert_mp4_to_wav(mp4_path: str, wav_path: str) -> None:
    """Convert MP4 to 16 kHz mono WAV using ffmpeg."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", mp4_path,
            "-ar", "16000", "-ac", "1",
            wav_path,
        ],
        check=True,
        capture_output=True,
    )


def _run_diarization(wav_path: str, rttm_path: str, hf_token: str, num_speakers: Optional[int] = None) -> None:
    """Run pyannote speaker diarization and write RTTM file."""
    global _pyannote_pipeline
    if _pyannote_pipeline is None:
        from pyannote.audio import Pipeline as PyannotePipeline  # heavy import
        _pyannote_pipeline = PyannotePipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token,
        )
    kwargs: Dict[str, Any] = {}
    if num_speakers is not None:
        kwargs["num_speakers"] = num_speakers
    diarization = _pyannote_pipeline(wav_path, **kwargs)
    with open(rttm_path, "w") as f:
        diarization.write_rttm(f)


def _run_whisper(wav_path: str) -> List[Dict[str, Any]]:
    """Transcribe audio with faster-whisper."""
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel  # heavy import
        _whisper_model = WhisperModel("medium", device="cuda", compute_type="float16")
    segments, _ = _whisper_model.transcribe(wav_path, word_timestamps=True)
    return [
        {"start": s.start, "end": s.end, "text": s.text.strip()}
        for s in segments
    ]


def _parse_rttm(rttm_path: str) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    with open(rttm_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 9 or parts[0] != "SPEAKER":
                continue
            start = float(parts[3])
            duration = float(parts[4])
            speaker = parts[7]
            segments.append({"start": start, "end": start + duration, "speaker": speaker})
    return segments


def _overlap(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    return max(0.0, min(a_end, b_end) - max(a_start, b_start))


def _assign_speaker(seg: Dict[str, Any], diar_segments: List[Dict[str, Any]]) -> str:
    best_speaker: Optional[str] = None
    best_overlap = 0.0
    for d in diar_segments:
        ov = _overlap(seg["start"], seg["end"], d["start"], d["end"])
        if ov > best_overlap:
            best_overlap = ov
            best_speaker = d["speaker"]
    return best_speaker or "UNKNOWN"


def _build_transcript(
    whisper_segments: List[Dict[str, Any]],
    diar_segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    return [
        {
            "speaker": _assign_speaker(seg, diar_segments),
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"],
        }
        for seg in whisper_segments
    ]


def _merge_consecutive(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not segments:
        return []
    merged = [segments[0].copy()]
    for seg in segments[1:]:
        last = merged[-1]
        if seg["speaker"] == last["speaker"]:
            last["end"] = seg["end"]
            last["text"] += " " + seg["text"]
        else:
            merged.append(seg.copy())
    return merged


def _format_transcript(transcript: List[Dict[str, Any]]) -> str:
    return "\n".join(
        f'[{seg["speaker"]}] ({seg["start"]:.2f}s - {seg["end"]:.2f}s): {seg["text"]}'
        for seg in transcript
    )


def _generate_report(transcript_text: str, openai_api_key: str) -> str:
    """Generate structured meeting report using OpenAI."""
    from openai import OpenAI  # import here to keep module lightweight if not used

    client = OpenAI(api_key=openai_api_key)

    prompt = f"""Rolün: Kurumsal toplantı analisti.

Aşağıda konuşmacı etiketleri (SPEAKER_00, SPEAKER_01 vb.) ile verilmiş bir toplantı dökümü bulunmaktadır.

Görevin bu toplantıyı analiz etmek ve Türkçe olarak aşağıdaki başlıklara göre bir rapor oluşturmaktır.

Kurallar:
- Sadece döküme dayalı bilgi kullan.
- Varsayım yapma veya yeni bilgi ekleme.
- Aynı konunun tekrarlarını birleştir.
- Gereksiz küçük detayları çıkar.
- Açık, teknik ve profesyonel bir dil kullan.
- Konuşmacıları SPEAKER_XX formatında referans ver.
- Çıktılar özel isimler hariç TÜRKÇE olmak zorunda

Rapor Formatı:

1. Toplantı Özeti
Toplantının amacı ve genel gidişatı hakkında kısa bir paragraf yaz.

2. Ana Tartışma Konuları
Toplantıda ele alınan temel başlıkları madde madde yaz.

3. Alınan Kararlar
Toplantıda net olarak alınmış kararları madde madde listele.

4. Aksiyon Maddeleri
Yapılması gereken işleri aşağıdaki formatta yaz:

- Görev:
- Sorumlu:
- Öncelik: (Yüksek / Orta / Düşük)

5. Kritik Bilgiler
Toplantıda geçen önemli teknik, finansal veya stratejik bilgiler.

6. Katılımcı Görüş Özeti
Her konuşmacının temel görüşünü yaz:

SPEAKER_00:
SPEAKER_01:

7. Açık Sorular / Belirsizlikler
Toplantıda netleşmemiş veya cevaplanmamış konular.

Toplantı Dökümü:
{transcript_text}"""

    response = client.responses.create(
        model="gpt-5",
        input=prompt,
    )
    return response.output_text


# ── Background processing task ────────────────────────────

async def process_meeting(
    job_id: str,
    mp4_bytes: bytes,
    filename: str,
    username: str,
) -> None:
    """Long-running background task: converts, transcribes, analyses and caches."""
    _jobs[job_id]["status"] = "running"

    with tempfile.TemporaryDirectory() as tmpdir:
        base = os.path.join(tmpdir, "meeting")
        mp4_path = base + ".mp4"
        wav_path = base + ".wav"
        rttm_path = base + ".rttm"

        try:
            settings = get_settings()

            # 1. Persist uploaded bytes
            with open(mp4_path, "wb") as f:
                f.write(mp4_bytes)

            # 2. Convert MP4 → WAV
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _convert_mp4_to_wav, mp4_path, wav_path)

            # 3. Speaker diarization
            await loop.run_in_executor(
                None, _run_diarization, wav_path, rttm_path, settings.hf_token, settings.meeting_num_speakers
            )

            # 4. Whisper transcription
            whisper_segments = await loop.run_in_executor(None, _run_whisper, wav_path)

            # 5. Merge speaker labels
            diar_segments = _parse_rttm(rttm_path)
            speaker_transcript = _build_transcript(whisper_segments, diar_segments)
            merged = _merge_consecutive(speaker_transcript)
            transcript_text = _format_transcript(merged)

            # 6. Generate report via OpenAI
            report_text = await loop.run_in_executor(
                None, _generate_report, transcript_text, settings.openai_api_key
            )

            # 7. Persist to MongoDB
            await save_result(username, filename, transcript_text, report_text)

            # 8. Mark job complete
            _jobs[job_id]["status"] = "done"
            _jobs[job_id]["transcript"] = transcript_text
            _jobs[job_id]["report"] = report_text

        except Exception as exc:
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["error"] = str(exc)
