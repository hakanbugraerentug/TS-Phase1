import logging
import logging.config

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .settings import get_settings
from .routers import report, docx

# ── Logging ───────────────────────────────────────────────────────────────────
logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        }
    },
    "root": {"level": "INFO", "handlers": ["console"]},
})

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TeamSync AI Server",
    description="Haftalık rapor üretimi ve docx export servisi.",
    version="2.0.0",
)

s = get_settings()
origins = [o.strip() for o in s.allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(report.router, tags=["Rapor"])
app.include_router(docx.router, tags=["Docx"])


@app.get("/health", tags=["Sistem"])
async def health() -> dict:
    return {"status": "ok"}
