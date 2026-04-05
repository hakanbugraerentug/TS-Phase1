from __future__ import annotations

from typing import Any, Dict, List, Optional

import motor.motor_asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .config import get_settings

router = APIRouter(prefix="/users", tags=["users"])


def get_collection() -> motor.motor_asyncio.AsyncIOMotorCollection:
    settings = get_settings()
    client: motor.motor_asyncio.AsyncIOMotorClient = motor.motor_asyncio.AsyncIOMotorClient(
        settings.mongo_uri
    )
    return client[settings.mongo_db]["users"]


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
async def get_users(
    collection: motor.motor_asyncio.AsyncIOMotorCollection = Depends(get_collection),
) -> List[UserOut]:
    """Veritabanındaki tüm kullanıcıları döndürür (fotoğraf verisi hariç)."""
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
async def delete_user(
    username: str,
    collection: motor.motor_asyncio.AsyncIOMotorCollection = Depends(get_collection),
) -> Dict[str, str]:
    """Verilen kullanıcı adına sahip kullanıcıyı siler."""
    result = await collection.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Kullanıcı bulunamadı: {username}")
    return {"detail": f"Kullanıcı silindi: {username}"}
