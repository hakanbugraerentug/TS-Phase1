from __future__ import annotations

import json
from typing import Any, Dict, List, Literal, Optional, TypedDict

from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field, ValidationError

from .config import get_settings
from .schemas import GenerateReportResponse


# ── Pydantic models for structured LLM output ───────────
class ProjectBulletOutput(BaseModel):
    """Tek bir proje için LLM'in döndüreceği bullet yapısı."""
    bullet0: str = Field(description="Proje adı köşeli parantez içinde, ör. [Atlas CRM]")
    bullet1: Optional[List[str]] = Field(default=None, description="Kategori listesi, genellikle ['Genel']")
    bullet2: Optional[List[str]] = Field(default=None, description="Tamamlanan işler")
    bullet3: Optional[List[str]] = Field(default=None, description="Takip maddeleri, sonraki adımlar")


class FullReportOutput(BaseModel):
    """Repair node'u için tam rapor şeması."""
    title: str
    instructions: List[str]
    bullet_lines: List[ProjectBulletOutput]
    traceability: List[Dict[str, Any]]
    source_map: Dict[str, Any]


# ── LangGraph State ─────────────────────────────────────
class GraphState(TypedDict, total=False):
    raw_comments: List[Dict[str, Any]]
    custom_prompt: Optional[str]
    grouped_comments: Dict[str, List[Dict[str, Any]]]
    source_map: Dict[str, Dict[str, Any]]
    project_summaries: List[Dict[str, Any]]
    traceability: List[Dict[str, Any]]
    report_dict: Dict[str, Any]
    validated_report: Dict[str, Any]
    validation_error: str
    needs_repair: bool


# ── Helpers ──────────────────────────────────────────────
def _get_llm(temperature: float = 0.1) -> ChatOllama:
    settings = get_settings()
    # ChatOllama kendi endpoint path'ini ekler (/api/chat),
    # .env'de /v1 varsa temizle
    base = settings.llm_base_url.rstrip("/")
    if base.endswith("/v1"):
        base = base[:-3]
    return ChatOllama(
        model=settings.llm_model,
        base_url=base,
        temperature=temperature,
        timeout=settings.llm_timeout_seconds,
    )


def normalize_string_list(value: Any) -> Optional[List[str]]:
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        return [s] if s else None
    if isinstance(value, list):
        out = [str(item).strip() for item in value if item is not None and str(item).strip()]
        return out or None
    s = str(value).strip()
    return [s] if s else None


def infer_traceability(
    project_name: str,
    bullet_field: str,
    bullet_texts: Optional[List[str]],
    project_comments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Her bullet için ilgili projedeki comment'lerle basit kelime-örtüşme
    heuristiği uygulayarak traceability üretir.
    """
    if not bullet_texts:
        return []

    traces: List[Dict[str, Any]] = []

    for bullet in bullet_texts:
        bullet_lower = bullet.lower()
        bullet_words = {
            w.strip(".,;:!?()[]\"' ")
            for w in bullet_lower.split()
            if len(w.strip(".,;:!?()[]\"' ")) > 3
        }

        matched: List[str] = []
        for c in project_comments:
            comment_text = (c.get("userComment") or "").lower()
            comment_words = {
                w.strip(".,;:!?()[]\"' ")
                for w in comment_text.split()
                if len(w.strip(".,;:!?()[]\"' ")) > 3
            }
            if bullet_words & comment_words:
                matched.append(c["commentId"])

        # Eşleşme yoksa ilk comment'i fallback olarak bağla
        if not matched and project_comments:
            matched = [project_comments[0]["commentId"]]

        traces.append(
            {
                "project": project_name,
                "bullet_field": bullet_field,
                "text": bullet,
                "sources": matched,
            }
        )

    return traces


# ══════════════════════════════════════════════════════════
# GRAPH NODES
# ══════════════════════════════════════════════════════════

def preprocess_comments(state: GraphState) -> GraphState:
    comments = state["raw_comments"]
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    normalized: List[Dict[str, Any]] = []

    for i, row in enumerate(comments, start=1):
        item = dict(row)
        if not item.get("commentId"):
            item["commentId"] = f"C{i:04d}"

        project = (item.get("projectName") or "").strip()
        text = (item.get("userComment") or "").strip()
        if not project or not text:
            continue

        normalized.append(item)
        grouped.setdefault(project, []).append(item)

    for rows in grouped.values():
        rows.sort(key=lambda x: (x.get("date") or "", x.get("username") or ""))

    source_map = {r["commentId"]: r for r in normalized}

    return {
        "raw_comments": normalized,
        "grouped_comments": grouped,
        "source_map": source_map,
    }


def summarize_projects(state: GraphState) -> GraphState:
    grouped = state["grouped_comments"]
    custom_prompt = state.get("custom_prompt") or ""

    base_system = """You are a corporate weekly reporting assistant.

Your task:
- You will receive weekly user comments for a single project.
- Convert them into the following format:
  - bullet0: project name in brackets, example [Atlas CRM]
  - bullet1: category list, usually ["Genel"]
  - bullet2: completed work, implemented changes, resolved issues
  - bullet3: follow-up items, pending actions, meetings, next steps

Rules:
- Output language must be Turkish.
- Keep bullets short, formal, and report-friendly.
- Do not include usernames.
- Do not include dates in the bullet text.
- Avoid repetition.
- If no meaningful category split exists, use ["Genel"].
- If no follow-up exists, bullet3 can be null."""

    if custom_prompt:
        system_prompt = f"{base_system}\n\nEk talimatlar:\n{custom_prompt}"
    else:
        system_prompt = base_system

    llm = _get_llm(temperature=0.1)
    structured_llm = llm.with_structured_output(ProjectBulletOutput)

    summaries: List[Dict[str, Any]] = []
    traceability: List[Dict[str, Any]] = []

    for project_name, project_comments in grouped.items():
        llm_input = [
            {
                "commentId": c["commentId"],
                "date": c.get("date"),
                "username": c.get("username"),
                "userComment": c.get("userComment"),
            }
            for c in project_comments
        ]

        user_prompt = (
            f"Project name: {project_name}\n\n"
            f"Comments:\n{json.dumps(llm_input, ensure_ascii=False, indent=2)}"
        )

        result: ProjectBulletOutput = structured_llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ])

        parsed = result.model_dump()

        # Override/normalize
        parsed["bullet0"] = f"[{project_name}]"
        parsed["bullet1"] = normalize_string_list(parsed.get("bullet1")) or ["Genel"]
        parsed["bullet2"] = normalize_string_list(parsed.get("bullet2"))
        parsed["bullet3"] = normalize_string_list(parsed.get("bullet3"))

        summaries.append(parsed)

        for field in ("bullet2", "bullet3"):
            traceability.extend(
                infer_traceability(
                    project_name=project_name,
                    bullet_field=field,
                    bullet_texts=parsed.get(field),
                    project_comments=project_comments,
                )
            )

    return {"project_summaries": summaries, "traceability": traceability}


def assemble_report(state: GraphState) -> GraphState:
    report = {
        "title": "HAFTALIK GENEL RAPOR",
        "instructions": [
            "Bilgi girişi olduğu takdirde \u201c(Bir bilgi girilmemiştir.)\u201d ifadesi silinmelidir."
        ],
        "bullet_lines": state["project_summaries"],
        "traceability": state.get("traceability", []),
        "source_map": state.get("source_map", {}),
    }
    return {"report_dict": report}


def validate_report(state: GraphState) -> GraphState:
    try:
        validated = GenerateReportResponse.model_validate(state["report_dict"])
        return {
            "validated_report": validated.model_dump(),
            "needs_repair": False,
            "validation_error": "",
        }
    except ValidationError as e:
        return {
            "needs_repair": True,
            "validation_error": str(e),
        }


def repair_report(state: GraphState) -> GraphState:
    broken = state["report_dict"]
    error_text = state.get("validation_error", "")

    system_prompt = "You fix invalid weekly report JSON objects.\nReturn JSON only.\nDo not add explanations."

    user_prompt = (
        f"Fix the JSON below.\n\n"
        f"Validation error:\n{error_text}\n\n"
        f"JSON:\n{json.dumps(broken, ensure_ascii=False, indent=2)}\n\n"
        "Constraints:\n"
        "- title must be a string\n"
        "- instructions must be a list of strings\n"
        "- bullet_lines must be a list\n"
        "- each bullet line must contain:\n"
        "  - bullet0: bracketed string like [Project Name]\n"
        "  - bullet1: list of strings or null\n"
        "  - bullet2: list of strings or null\n"
        "  - bullet3: list of strings or null\n"
        "- traceability must be a list of objects\n"
        "- source_map must be an object"
    )

    llm = _get_llm(temperature=0.0)
    structured_llm = llm.with_structured_output(FullReportOutput)

    result: FullReportOutput = structured_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    return {"report_dict": result.model_dump()}


def route_after_validation(state: GraphState) -> Literal["repair_report", "__end__"]:
    if state.get("needs_repair"):
        return "repair_report"
    return END


# ══════════════════════════════════════════════════════════
# MANAGER REPORT MERGE (Müdür ve üstü için)
# ══════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════
# BUILD GRAPH
# ══════════════════════════════════════════════════════════
def build_graph() -> Any:
    builder = StateGraph(GraphState)

    builder.add_node("preprocess_comments", preprocess_comments)
    builder.add_node("summarize_projects", summarize_projects)
    builder.add_node("assemble_report", assemble_report)
    builder.add_node("validate_report", validate_report)
    builder.add_node("repair_report", repair_report)

    builder.add_edge(START, "preprocess_comments")
    builder.add_edge("preprocess_comments", "summarize_projects")
    builder.add_edge("summarize_projects", "assemble_report")
    builder.add_edge("assemble_report", "validate_report")
    builder.add_conditional_edges(
        "validate_report",
        route_after_validation,
        {"repair_report": "repair_report", END: END},
    )
    builder.add_edge("repair_report", "validate_report")

    return builder.compile()