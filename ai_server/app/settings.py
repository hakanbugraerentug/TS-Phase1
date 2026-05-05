from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM
    llm_base_url: str = "http://localhost:11434/v1"
    llm_api_key: str = "not-needed"
    llm_model: str = "qwen3:latest"
    llm_timeout: int = 120
    llm_max_retries: int = 2

    # Thinking model desteği (Qwen3, Kimi-K2 vb.)
    llm_enable_thinking: bool = False
    llm_thinking_budget: int = 4096

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_origins: str = "*"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
