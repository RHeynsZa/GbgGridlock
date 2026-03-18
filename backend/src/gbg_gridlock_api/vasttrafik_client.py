from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx


@dataclass
class OAuthToken:
    access_token: str
    expires_at: datetime


class VasttrafikClient:
    def __init__(
        self,
        token_url: str,
        api_base_url: str,
        client_id: str,
        client_secret: str,
        auth_key: str = "",
    ):
        self._token_url = token_url
        self._api_base_url = api_base_url.rstrip("/")
        self._client_id = client_id
        self._client_secret = client_secret
        self._auth_key = auth_key.strip()
        self._token: OAuthToken | None = None

    async def _ensure_token(self, client: httpx.AsyncClient) -> str:
        now = datetime.now(timezone.utc)
        if self._token and now < (self._token.expires_at - timedelta(minutes=5)):
            return self._token.access_token

        token_headers: dict[str, str] = {}
        if self._auth_key:
            token_headers["Ocp-Apim-Subscription-Key"] = self._auth_key

        response = await client.post(
            self._token_url,
            data={"grant_type": "client_credentials"},
            auth=(self._client_id, self._client_secret),
            headers=token_headers or None,
            timeout=20.0,
        )
        response.raise_for_status()
        payload = response.json()

        expires_in = int(payload.get("expires_in", 300))
        self._token = OAuthToken(
            access_token=payload["access_token"],
            expires_at=now + timedelta(seconds=expires_in),
        )
        return self._token.access_token

    async def fetch_departures(self, client: httpx.AsyncClient, stop_area_gid: str, time_span: int = 45) -> dict:
        token = await self._ensure_token(client)
        request_headers = {"Authorization": f"Bearer {token}"}
        if self._auth_key:
            request_headers["Ocp-Apim-Subscription-Key"] = self._auth_key

        response = await client.get(
            f"{self._api_base_url}/stop-areas/{stop_area_gid}/departures",
            params={"timeSpan": str(time_span)},
            headers=request_headers,
            timeout=20.0,
        )
        response.raise_for_status()
        return response.json()
