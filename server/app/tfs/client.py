"""
TFS / Azure DevOps Server HTTP istemcisi.

Tüm ağ erişimi bu modül üzerinden yapılır.
Kimlik doğrulama, base URL ve API version yönetimi burada.
"""
from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from ..config import get_settings


# ── Sabitler ──────────────────────────────────────────────
_WIT_API_VERSION = "5.0"
_GIT_API_VERSION = "5.0"
_WIQL_API_VERSION = "5.0"


def _make_auth_header(pat: str) -> str:
    """PAT'i Base64 ile kodlayarak Basic auth header değeri üretir."""
    token = base64.b64encode(f":{pat}".encode()).decode()
    return f"Basic {token}"


def _base_headers(pat: str) -> Dict[str, str]:
    return {
        "Authorization": _make_auth_header(pat),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _patch_headers(pat: str) -> Dict[str, str]:
    """PATCH/POST work item için Content-Type farklı."""
    h = _base_headers(pat)
    h["Content-Type"] = "application/json-patch+json"
    return h


# ══════════════════════════════════════════════════════════
# TFSClient
# ══════════════════════════════════════════════════════════

class TFSClient:
    """
    TFS REST API'siyle konuşan senkron HTTP istemcisi.
    httpx.Client kullanır; her metod kendi bağlantısını açıp kapatır
    (FastAPI async context'inde run_in_executor ile çağrılır).
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.base_url: str = settings.tfs_base_url.rstrip("/")
        self.collection: str = settings.tfs_collection
        self.project: str = settings.tfs_project
        self.pat: str = settings.tfs_pat
        self.timeout: int = settings.tfs_timeout_seconds

    # ── URL helpers ───────────────────────────────────────

    def _collection_url(self) -> str:
        return f"{self.base_url}/{self.collection}"

    def _project_url(self) -> str:
        return f"{self._collection_url()}/{self.project}"

    def _wit_url(self, path: str) -> str:
        return f"{self._collection_url()}/_apis/wit/{path}"

    def _git_url(self, path: str) -> str:
        return f"{self._collection_url()}/_apis/git/{path}"

    # ── HTTP helpers ──────────────────────────────────────

    def _get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Any:
        with httpx.Client(timeout=self.timeout, verify=False) as client:
            resp = client.get(url, headers=_base_headers(self.pat), params=params)
            resp.raise_for_status()
            return resp.json()

    def _post_patch(self, url: str, body: Any) -> Any:
        """Work item oluşturma için PATCH (TFS zorunluluğu)."""
        with httpx.Client(timeout=self.timeout, verify=False) as client:
            resp = client.patch(url, headers=_patch_headers(self.pat), json=body)
            resp.raise_for_status()
            return resp.json()

    def _post_json(self, url: str, body: Any) -> Any:
        """WIQL sorguları için standart POST."""
        with httpx.Client(timeout=self.timeout, verify=False) as client:
            resp = client.post(url, headers=_base_headers(self.pat), json=body)
            resp.raise_for_status()
            return resp.json()

    # ══════════════════════════════════════════════════════
    # Work Item – Create
    # ══════════════════════════════════════════════════════

    def create_work_item(
        self,
        *,
        work_item_type: str,
        title: str,
        description: Optional[str] = None,
        assigned_to: Optional[str] = None,
        tags: Optional[str] = None,
        priority: Optional[int] = None,
        extra_fields: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Yeni bir work item oluşturur.
        Dönen değer TFS'in ham work item JSON'udur.
        """
        ops: List[Dict[str, Any]] = [
            {"op": "add", "path": "/fields/System.Title", "value": title},
        ]

        if description:
            ops.append({"op": "add", "path": "/fields/System.Description", "value": description})
        if assigned_to:
            ops.append({"op": "add", "path": "/fields/System.AssignedTo", "value": assigned_to})
        if tags:
            ops.append({"op": "add", "path": "/fields/System.Tags", "value": tags})
        if priority is not None:
            ops.append({"op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": priority})

        if extra_fields:
            for field_path, value in extra_fields.items():
                # Kullanıcı hem "/fields/X" hem "X" formatında verebilir
                if not field_path.startswith("/fields/"):
                    field_path = f"/fields/{field_path}"
                ops.append({"op": "add", "path": field_path, "value": value})

        url = (
            f"{self._project_url()}/_apis/wit/workitems/${work_item_type}"
            f"?api-version={_WIT_API_VERSION}"
        )
        return self._post_patch(url, ops)

    # ══════════════════════════════════════════════════════
    # Work Items – Query (WIQL)
    # ══════════════════════════════════════════════════════

    def query_work_items(
        self,
        *,
        assigned_to: Optional[str] = None,
        work_item_types: Optional[List[str]] = None,
        states: Optional[List[str]] = None,
        top: int = 200,
    ) -> List[Dict[str, Any]]:
        """
        WIQL ile work item listesi çeker, ardından tam field'larını getirir.
        assigned_to: kullanıcı display name veya e-posta (None → hepsi)
        """
        type_filter = ""
        if work_item_types:
            quoted = ", ".join(f"'{t}'" for t in work_item_types)
            type_filter = f"AND [System.WorkItemType] IN ({quoted})"

        state_filter = ""
        if states:
            quoted = ", ".join(f"'{s}'" for s in states)
            state_filter = f"AND [System.State] IN ({quoted})"

        assigned_filter = ""
        if assigned_to:
            assigned_filter = f"AND [System.AssignedTo] = '{assigned_to}'"

        wiql = f"""
        SELECT [System.Id]
        FROM WorkItems
        WHERE
            [System.TeamProject] = '{self.project}'
            {type_filter}
            {state_filter}
            {assigned_filter}
        ORDER BY [System.ChangedDate] DESC
        """

        url = f"{self._project_url()}/_apis/wit/wiql?api-version={_WIQL_API_VERSION}&$top={top}"
        result = self._post_json(url, {"query": wiql})
        ids = [item["id"] for item in result.get("workItems", [])]

        if not ids:
            return []

        return self._get_work_items_by_ids(ids)

    def _get_work_items_by_ids(self, ids: List[int]) -> List[Dict[str, Any]]:
        """ID listesinden tam work item detaylarını çeker (200'lük batch'ler halinde)."""
        fields = [
            "System.Id",
            "System.Title",
            "System.Description",
            "System.State",
            "System.AssignedTo",
            "System.WorkItemType",
            "System.CreatedDate",
            "System.ChangedDate",
            "System.CreatedBy",
            "System.Tags",
            "System.AreaPath",
            "System.IterationPath",
            "Microsoft.VSTS.Common.Priority",
        ]
        fields_param = ",".join(fields)

        all_items: List[Dict[str, Any]] = []

        # TFS max 200 ID per request
        for i in range(0, len(ids), 200):
            chunk = ids[i : i + 200]
            ids_str = ",".join(map(str, chunk))
            url = (
                f"{self._collection_url()}/_apis/wit/workitems"
                f"?ids={ids_str}&fields={fields_param}&api-version={_WIT_API_VERSION}"
            )
            data = self._get(url)
            all_items.extend(data.get("value", []))

        return all_items

    # ══════════════════════════════════════════════════════
    # Commits
    # ══════════════════════════════════════════════════════

    def list_repositories(self) -> List[Dict[str, Any]]:
        """Projedeki tüm git repolarını listeler."""
        url = f"{self._project_url()}/_apis/git/repositories?api-version={_GIT_API_VERSION}"
        data = self._get(url)
        return data.get("value", [])

    def get_commits(
        self,
        *,
        repo_name: Optional[str] = None,
        repo_id: Optional[str] = None,
        author: Optional[str] = None,
        days: int = 30,
        top: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Belirtilen repo'nun commit geçmişini çeker.
        repo_name veya repo_id verilmezse projedeki tüm repolar taranır.
        """
        from_date = (
            datetime.now(timezone.utc) - timedelta(days=days)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Hangi repolar taranacak?
        if repo_id:
            repos = [{"id": repo_id, "name": repo_id}]
        elif repo_name:
            repos = [{"id": repo_name, "name": repo_name}]
        else:
            repos = self.list_repositories()

        all_commits: List[Dict[str, Any]] = []

        for repo in repos:
            rid = repo["id"]
            rname = repo.get("name", rid)
            project_name = (repo.get("project") or {}).get("name", self.project)

            params: Dict[str, Any] = {
                "searchCriteria.fromDate": from_date,
                "$top": top,
                "api-version": _GIT_API_VERSION,
            }
            if author:
                params["searchCriteria.author"] = author

            url = (
                f"{self._collection_url()}/_apis/git/repositories/{rid}/commits"
            )
            try:
                data = self._get(url, params=params)
            except httpx.HTTPStatusError:
                # Erişim yetkisi olmayan repo'ları atla
                continue

            for commit in data.get("value", []):
                commit["_repo_name"] = rname
                commit["_project_name"] = project_name
            all_commits.extend(data.get("value", []))

        # En yeni commit'ler önce
        all_commits.sort(
            key=lambda c: (c.get("author") or c.get("committer") or {}).get("date", ""),
            reverse=True,
        )
        return all_commits