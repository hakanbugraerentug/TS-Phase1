"""
TFS / Azure DevOps Server endpoint'leri.

Endpoint'ler:
  POST /tfs/work-items          – Yeni work item oluştur
  GET  /tfs/work-items          – Work item listesi (WIQL)
  GET  /tfs/commits             – Commit geçmişi
"""
from __future__ import annotations

import asyncio
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from .client import TFSClient
from .schemas import (
    CommitListResponse,
    CommitResponse,
    CreateWorkItemRequest,
    CreateWorkItemResponse,
    WorkItemFieldsResponse,
    WorkItemListResponse,
)

router = APIRouter(prefix="/tfs", tags=["TFS"])


def _get_client() -> TFSClient:
    return TFSClient()


# ══════════════════════════════════════════════════════════
# 1) Work Item Oluştur
# ══════════════════════════════════════════════════════════

@router.post(
    "/work-items",
    response_model=CreateWorkItemResponse,
    summary="TFS'de yeni work item oluştur",
    description=(
        "Kullanıcının formdan gönderdiği verileri TFS'e iletir ve "
        "oluşturulan work item'ın ID, URL ve temel bilgilerini döner."
    ),
    status_code=201,
)
async def create_work_item(payload: CreateWorkItemRequest) -> CreateWorkItemResponse:
    client = _get_client()
    loop = asyncio.get_event_loop()

    try:
        raw = await loop.run_in_executor(
            None,
            lambda: client.create_work_item(
                work_item_type=payload.work_item_type,
                title=payload.title,
                description=payload.description,
                assigned_to=payload.assigned_to,
                tags=payload.tags,
                priority=payload.priority,
                extra_fields=payload.extra_fields,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TFS isteği başarısız: {exc}") from exc

    fields = raw.get("fields", {})
    return CreateWorkItemResponse(
        id=raw["id"],
        url=raw.get("url", ""),
        title=fields.get("System.Title", payload.title),
        state=fields.get("System.State"),
        work_item_type=fields.get("System.WorkItemType", payload.work_item_type),
    )


# ══════════════════════════════════════════════════════════
# 2) Work Item Listesi
# ══════════════════════════════════════════════════════════

@router.get(
    "/work-items",
    response_model=WorkItemListResponse,
    summary="TFS work item listesini getir",
    description=(
        "WIQL ile TFS'ten work item'ları çeker. "
        "Opsiyonel olarak assigned_to, tip ve durum filtresi uygulanabilir."
    ),
)
async def list_work_items(
    assigned_to: Optional[str] = Query(
        default=None,
        description="Filtre: kişi display name veya e-posta",
        examples=["ali.veli@sirket.com"],
    ),
    work_item_types: Optional[List[str]] = Query(
        default=None,
        alias="type",
        description="Filtre: work item tipleri (tekrar gönderilebilir)",
        examples=["Task", "Bug"],
    ),
    states: Optional[List[str]] = Query(
        default=None,
        alias="state",
        description="Filtre: durumlar (tekrar gönderilebilir)",
        examples=["Active", "New"],
    ),
    top: int = Query(default=200, ge=1, le=500, description="Maksimum sonuç sayısı"),
) -> WorkItemListResponse:
    client = _get_client()
    loop = asyncio.get_event_loop()

    try:
        raw_items = await loop.run_in_executor(
            None,
            lambda: client.query_work_items(
                assigned_to=assigned_to,
                work_item_types=work_item_types,
                states=states,
                top=top,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TFS isteği başarısız: {exc}") from exc

    items = [WorkItemFieldsResponse.from_tfs(r) for r in raw_items]
    return WorkItemListResponse(count=len(items), items=items)


# ══════════════════════════════════════════════════════════
# 3) Commit Geçmişi
# ══════════════════════════════════════════════════════════

@router.get(
    "/commits",
    response_model=CommitListResponse,
    summary="Git commit geçmişini getir",
    description=(
        "Projedeki repoların commit geçmişini döner. "
        "Repo belirtilmezse tüm repolar taranır. "
        "Her commit'e hangi repo ve proje bilgisi eklenir."
    ),
)
async def list_commits(
    repo_name: Optional[str] = Query(
        default=None,
        description="Belirli bir repo adı (belirtilmezse tüm repolar)",
    ),
    repo_id: Optional[str] = Query(
        default=None,
        description="Belirli bir repo UUID'si (repo_name'e alternatif)",
    ),
    author: Optional[str] = Query(
        default=None,
        description="Filtre: yazar adı veya e-posta",
        examples=["ali.veli"],
    ),
    days: int = Query(
        default=30,
        ge=1,
        le=365,
        description="Kaç günlük commit geçmişi çekilsin",
    ),
    top: int = Query(
        default=100,
        ge=1,
        le=500,
        description="Repo başına maksimum commit sayısı",
    ),
) -> CommitListResponse:
    client = _get_client()
    loop = asyncio.get_event_loop()

    try:
        raw_commits = await loop.run_in_executor(
            None,
            lambda: client.get_commits(
                repo_name=repo_name,
                repo_id=repo_id,
                author=author,
                days=days,
                top=top,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TFS isteği başarısız: {exc}") from exc

    commits = [CommitResponse.from_tfs(c) for c in raw_commits]
    return CommitListResponse(count=len(commits), commits=commits)