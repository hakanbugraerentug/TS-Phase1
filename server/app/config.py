from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # LLM
    llm_base_url: str = "http://localhost:11434/v1"
    llm_model: str = "gpt-oss:20b"
    llm_api_key: str = ""
    llm_timeout_seconds: int = 120

    # Thinking model support
    # Set to True if the model supports extended thinking (Qwen3, Kimi-K2, etc.)
    llm_enable_thinking: bool = False
    # Token budget for thinking. Ignored when llm_enable_thinking=False.
    llm_thinking_budget: int = 8192

    # Pipeline
    max_repair_attempts: int = 2

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_title: str = "Weekly Report API"

    # Meeting recording pipeline
    hf_token: str = ""
    openai_api_key: str = ""
    meeting_num_speakers: Optional[int] = None
    whisper_local_model_dir: str = ""
    pyannote_diarization_config: str = ""
    temp_dir: str = "/tmp/meetings"
    max_file_size_mb: int = 200
    meeting_worker_count: int = 1

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "TeamSyncDb"

    # ── TFS / Azure DevOps Server ────────────────────────
    tfs_base_url: str = "https://tfs02.yapikredi.com.tr/tfs"
    tfs_collection: str = "HBTUYTMCollection"
    tfs_project: str = "TeamSync"
    tfs_pat: str = ""
    tfs_timeout_seconds: int = 30

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
