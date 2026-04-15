from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # LLM
    llm_base_url: str = "http://localhost:11434/v1"
    llm_model: str = "gpt-oss:20b"
    llm_api_key: str = ""
    llm_timeout_seconds: int = 120

    # Pipeline
    max_repair_attempts: int = 2

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_title: str = "Weekly Report API"

    # Meeting recording pipeline
    hf_token: str = ""
    openai_api_key: str = ""
    # Set to None to let pyannote auto-detect the number of speakers
    meeting_num_speakers: Optional[int] = None
    # Meeting models
    whisper_local_model_dir: str = ""
    pyannote_diarization_config: str = ""
    temp_dir: str = "/tmp/meetings"
    max_file_size_mb: int = 200
    meeting_worker_count: int = 1

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "TeamSyncDb"

    # ── TFS / Azure DevOps Server ────────────────────────
    # Örnek: https://tfs02.sirket.com.tr/tfs
    tfs_base_url: str = "https://tfs02.yapikredi.com.tr/tfs"
    # TFS Collection adı
    tfs_collection: str = "HBTUYTMCollection"
    # TFS Proje adı
    tfs_project: str = "TeamSync"
    # Personal Access Token
    tfs_pat: str = ""
    # HTTP istek zaman aşımı (saniye)
    tfs_timeout_seconds: int = 30


    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()