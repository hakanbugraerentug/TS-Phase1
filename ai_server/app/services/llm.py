from __future__ import annotations

import json
import logging
import re
from typing import Any

from openai import AsyncOpenAI, APIError

from ..settings import get_settings

logger = logging.getLogger(__name__)


def _build_client() -> AsyncOpenAI:
    s = get_settings()
    base_url = s.llm_base_url.rstrip("/")
    if not base_url.endswith("/v1"):
        base_url = f"{base_url}/v1"
    return AsyncOpenAI(
        base_url=base_url,
        api_key=s.llm_api_key,
        timeout=s.llm_timeout,
        max_retries=0,  # retry'ı kendimiz yönetiyoruz
    )


def _build_extra_body() -> dict[str, Any]:
    """Thinking model parametrelerini döndürür. Thinking kapalıysa boş dict."""
    s = get_settings()
    if not s.llm_enable_thinking:
        return {}
    return {
        "enable_thinking": True,
        "thinking": {"budget_tokens": s.llm_thinking_budget},
    }


def strip_thinking(text: str) -> str:
    """<think>...</think> bloklarını ve markdown fence'leri temizler."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        return fence.group(1).strip()
    return text.strip()


async def chat_json(
    system: str,
    user: str,
    attempt_label: str = "",
) -> dict[str, Any]:
    """
    LLM'e system + user mesajı gönderir, JSON dict döndürür.
    Başarısız parse veya API hatası durumunda ValueError fırlatır.
    Retry mantığı üst katmanda (pipeline) yönetilir.
    """
    s = get_settings()
    client = _build_client()
    extra_body = _build_extra_body()

    try:
        response = await client.chat.completions.create(
            model=s.llm_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.1,
            **({"extra_body": extra_body} if extra_body else {}),
        )
    except APIError as exc:
        raise ValueError(f"LLM API hatası [{attempt_label}]: {exc}") from exc

    raw = response.choices[0].message.content or ""
    clean = strip_thinking(raw)

    try:
        return json.loads(clean)
    except json.JSONDecodeError as exc:
        logger.warning("JSON parse hatası [%s]: %s\nHam çıktı: %s", attempt_label, exc, clean[:300])
        raise ValueError(f"JSON parse hatası [{attempt_label}]: {exc}") from exc
