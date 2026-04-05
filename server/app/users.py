from __future__ import annotations

from typing import Any, Dict, List, Optional

import motor.motor_asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .config import get_settings

router = APIRouter(prefix="/users", tags=["users"])

_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None


def _get_collection() -> motor.motor_asyncio.AsyncIOMotorCollection:
    global _client
    settings = get_settings()
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    return _client[settings.mongo_db]["users"]


class UserOut(BaseModel):
    username: str
    fullName: str
    title: Optional[str] = None
    department: Optional[str] = None
    sector: Optional[str] = None
    directorate: Optional[str] = None
    manager: Optional[str] = None
    mail: Optional[str] = None
    distinguishedName: Optional[str] = None


def _to_user_out(doc: Dict[str, Any]) -> UserOut:
    # The MongoDB document stores the full name under the 'name' key,
    # matching the .NET BsonElement("name") → FullName mapping convention.
    return UserOut(
        username=doc.get("username", ""),
        fullName=doc.get("name", ""),
        title=doc.get("title"),
        department=doc.get("department"),
        sector=doc.get("sector"),
        directorate=doc.get("directorate"),
        manager=doc.get("manager"),
        mail=doc.get("mail"),
        distinguishedName=doc.get("distinguishedName"),
    )


@router.get("", response_model=List[UserOut], summary="Tüm kullanıcıları listele")
async def get_users() -> List[UserOut]:
    """Veritabanındaki tüm kullanıcıları döndürür (fotoğraf verisi hariç)."""
    collection = _get_collection()
    docs = await collection.find({}, {"photo": 0}).to_list(length=None)
    return [_to_user_out(d) for d in docs]


@router.delete(
    "/{username}",
    status_code=200,
    summary="Kullanıcı sil",
    responses={
        404: {"description": "Kullanıcı bulunamadı"},
    },
)
async def delete_user(username: str) -> Dict[str, str]:
    """Verilen kullanıcı adına sahip kullanıcıyı siler."""
    collection = _get_collection()
    result = await collection.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Kullanıcı bulunamadı: {username}")
    return {"detail": f"Kullanıcı silindi: {username}"}
