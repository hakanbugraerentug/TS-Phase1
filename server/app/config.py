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
    # Optional: path to the directory that contains the
    # models--pyannote--speaker-diarization-3.1 HF cache folder.
    # When set, the model is loaded fully offline from that directory.
    # When empty, the model is downloaded from HuggingFace using HF_TOKEN.
    pyannote_local_model_dir: str = ""

    # MongoDB (for caching meeting results)
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "TeamSyncDb"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()