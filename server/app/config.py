from pydantic_settings import BaseSettings
from functools import lru_cache


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

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()