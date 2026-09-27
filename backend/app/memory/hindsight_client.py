import httpx
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.config.settings import settings


class HindsightClient:
    def __init__(self):
        self.base_url = settings.hindsight_api_url.rstrip("/")
        self.api_key = settings.hindsight_api_key
        self.bank_id = settings.hindsight_bank_id
        self.client = httpx.AsyncClient(timeout=30.0)

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def retain(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/default/banks/{self.bank_id}/memories"
        payload = {
            "content": content,
            "metadata": metadata or {}
        }
        response = await self.client.post(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    async def retain_batch(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/default/banks/{self.bank_id}/memories/batch"
        payload = {"items": items}
        response = await self.client.post(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    async def recall(self, query: str, limit: int = 10, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/default/banks/{self.bank_id}/recall"
        payload = {
            "query": query,
            "limit": limit,
            "filters": filters or {}
        }
        response = await self.client.post(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    async def reflect(self, question: str, disposition: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/default/banks/{self.bank_id}/reflect"
        payload = {
            "question": question,
            "disposition": disposition
        }
        response = await self.client.post(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    async def list_memories(
        self,
        limit: int = 100,
        offset: int = 0,
        q: Optional[str] = None,
        type_filter: Optional[str] = None,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/default/banks/{self.bank_id}/memories/list"
        params = {"limit": limit, "offset": offset}
        if q:
            params["q"] = q
        if type_filter:
            params["type"] = type_filter
        if state:
            params["state"] = state
        response = await self.client.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        return response.json()

    async def get_memory(self, memory_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/default/banks/{self.bank_id}/memories/{memory_id}"
        response = await self.client.get(url, headers=self._headers())
        response.raise_for_status()
        return response.json()

    async def health_check(self) -> bool:
        try:
            url = f"{self.base_url}/health/live"
            response = await self.client.get(url, timeout=5.0)
            return response.status_code == 200
        except Exception:
            return False

    async def close(self):
        await self.client.aclose()


hindsight_client = HindsightClient()