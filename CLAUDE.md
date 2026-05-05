# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

TeamSync is a corporate team management platform with four distinct service components:

| Directory | Stack | Port | Purpose |
|-----------|-------|------|---------|
| `frontend/` | React 19 + TypeScript + Vite + Tailwind | 5173 | SPA UI |
| `backend/` | .NET 8 Clean Architecture | 8000 | REST API + auth |
| `server/` | Python FastAPI (report/meeting/TFS) | 8000 | AI pipeline server |
| `ai_server/` | Python FastAPI (report only, v2) | 8000 | Simplified AI server |

`server/` and `ai_server/` are alternate implementations of the AI backend — `ai_server/` is the newer, slimmer version (report + docx only). `server/` is the full-featured version that additionally handles meeting transcription and TFS/Azure DevOps integration.

Local ML models live in `models/` (Whisper, Pyannote diarization, Pyannote segmentation) and are loaded by `server/` for the meeting pipeline.

## Commands

### Frontend
```bash
cd frontend
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build to dist/
```

### Backend (.NET 8)
```bash
cd backend
dotnet build

cd backend/src/TeamSync.API
dotnet run        # starts at http://localhost:8000
# Swagger UI: http://localhost:8000/swagger (Development mode only)

# Seed demo user
mongosh TeamSyncDb backend/seed-demo.js
```

### Server (Python FastAPI — full)
```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env   # fill in LLM_BASE_URL, TFS_PAT, etc.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### AI Server (Python FastAPI — slim)
```bash
cd ai_server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Backend Docker
```bash
cd server
docker build -t teamsync-server .
docker run -p 8000:8000 --env-file .env teamsync-server
```

## Architecture

### Frontend (`frontend/`)
Single-page React app. No test runner is configured. Key pages map to files in `frontend/components/`:
- `Login.tsx` — JWT auth against the .NET backend
- `Dashboard.tsx` / `HomePage.tsx` — main views
- `WeeklySummary.tsx` — calls `POST /api/llm/chat` on the .NET backend (LLM proxy) to generate summaries
- `MeetingReport.tsx` — meeting transcription upload/results (calls `server/` meeting endpoints)
- `TfsPage.tsx` — TFS work item management (calls `server/` TFS endpoints)
- `Projects.tsx`, `Teams.tsx`, `ProjectDetail.tsx` — CRUD via .NET backend

### Backend (`backend/`)
Clean Architecture with four layers in `backend/src/`:
- `TeamSync.Domain` — entities (`User`, `Project`, `Team`, `Comment`) and repository interfaces; no dependencies
- `TeamSync.Application` — DTOs, `AuthService`, CQRS handlers; depends on Domain
- `TeamSync.Persistency` — MongoDB repositories, `TokenService`, `LdapService`; depends on Domain + Application
- `TeamSync.API` — controllers, DI wiring, CORS, JWT, Swagger; depends on Application + Persistency

Auth is demo-mode: any username auto-registers on first login; `admin/admin` always returns an Administrator user. All endpoints except `POST /auth/login` require JWT Bearer.

The backend also proxies LLM requests via `POST /api/llm/chat` (used by `WeeklySummary`) and calls a VLM service for project banner image generation. Both support corporate CA certificates via `VLM_CA_CERT_PATH` / `LLM_CA_CERT_PATH`.

### Server (`server/`)
FastAPI app with three feature areas:

**Report pipeline** (`app/pipeline.py`) — LangGraph state machine:
1. `preprocess_comments` — normalise and group by project
2. `summarize_projects` — per-project LLM call via LangChain `ChatOpenAI` → structured JSON
3. `assemble_report` — combine into full report dict
4. `validate_report` — Pydantic validation; if fails → `repair_report` node retries
5. Output: `GenerateReportResponse` with `bullet_lines`, `traceability`, `source_map`

**Meeting pipeline** (`app/meetings/`, `app/meeting.py`) — async job queue:
- Upload audio/video → extract audio (MoviePy) → speaker diarization (Pyannote) → transcription (faster-whisper) → LLM meeting report
- Results cached in MongoDB (`meeting_records` collection)
- Models loaded lazily from paths set in `WHISPER_LOCAL_MODEL_DIR` and `PYANNOTE_DIARIZATION_CONFIG`

**TFS integration** (`app/tfs/`) — proxies to Azure DevOps Server REST API:
- `POST /tfs/work-items` — create work item
- `GET /tfs/work-items` — WIQL query with filters
- `GET /tfs/commits` — commit history across repos

### AI Server (`ai_server/`)
Simpler v2 of the report pipeline. Routers in `ai_server/app/routers/`: `report.py` and `docx.py`. No meeting or TFS features. Uses `ai_server/app/services/` for business logic.

## Configuration

### Frontend environment
Create `frontend/.env.local`:
```
GEMINI_API_KEY=your-gemini-key
```

### Backend environment
Copy `backend/env.example` to `backend/.env`:
```
JWT_SECRET_KEY=...
MONGODB_CONNECTION_STRING=mongodb://localhost:27017
MONGODB_DATABASE_NAME=TeamSyncDb
ALLOWED_ORIGINS=http://localhost:5173
VLM_BASE_URL=http://your-vlm-host/
LLM_BASE_URL=http://your-llm-host/
```

### Server environment
Copy `server/env.example` to `server/.env`. Key variables:
```
LLM_BASE_URL=http://your-llm-server:8080   # OpenAI-compatible; /v1 appended automatically
LLM_MODEL=Qwen/Qwen3-32B
LLM_ENABLE_THINKING=false                  # set true for Qwen3/Kimi-K2
TFS_PAT=your-personal-access-token
WHISPER_LOCAL_MODEL_DIR=/path/to/models/whisper-small
PYANNOTE_DIARIZATION_CONFIG=/path/to/models/speaker-diarization-3.1/config.yaml
MONGODB_URL=mongodb://localhost:27017
```

## Key Integration Points

- The `server/` LLM client (`app/pipeline.py:_get_llm`) accepts any OpenAI-compatible endpoint and automatically appends `/v1` if missing. Thinking-model support is passed via `extra_body`.
- The `.NET` backend's LLM proxy always injects the model name from `LlmSettings.Model`, ignoring any model sent by the client.
- MongoDB database name is `TeamSyncDb` across all services.
- The `server/` settings are cached via `@lru_cache` on `get_settings()` — restart the server after `.env` changes.
