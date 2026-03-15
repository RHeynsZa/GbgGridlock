from __future__ import annotations

import pytest

from gbg_gridlock_api.vasttrafik_client import VasttrafikClient


class FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class FakeHttpClient:
    def __init__(self):
        self.post_calls: list[dict] = []
        self.get_calls: list[dict] = []

    async def post(self, url: str, **kwargs):
        self.post_calls.append({"url": url, **kwargs})
        return FakeResponse({"access_token": "token-123", "expires_in": 300})

    async def get(self, url: str, **kwargs):
        self.get_calls.append({"url": url, **kwargs})
        return FakeResponse({"results": []})


@pytest.mark.anyio
async def test_fetch_departures_sends_auth_key_when_configured():
    client = VasttrafikClient(
        token_url="https://ext-api.vasttrafik.se/token",
        api_base_url="https://ext-api.vasttrafik.se/pr/v4",
        client_id="id",
        client_secret="secret",
        auth_key="auth-key",
    )
    http_client = FakeHttpClient()

    await client.fetch_departures(http_client, "9021014001760000")

    assert http_client.post_calls[0]["headers"] == {"Ocp-Apim-Subscription-Key": "auth-key"}
    assert http_client.get_calls[0]["headers"]["Authorization"] == "Bearer token-123"
    assert http_client.get_calls[0]["headers"]["Ocp-Apim-Subscription-Key"] == "auth-key"
    assert http_client.get_calls[0]["params"] == {"timeSpan": "45", "transportModes": "tram,bus,ferry,boat"}


@pytest.mark.anyio
async def test_fetch_departures_omits_auth_key_when_not_set():
    client = VasttrafikClient(
        token_url="https://ext-api.vasttrafik.se/token",
        api_base_url="https://ext-api.vasttrafik.se/pr/v4",
        client_id="id",
        client_secret="secret",
        auth_key="",
    )
    http_client = FakeHttpClient()

    await client.fetch_departures(http_client, "9021014001760000")

    assert http_client.post_calls[0]["headers"] is None
    assert http_client.get_calls[0]["headers"] == {"Authorization": "Bearer token-123"}
    assert http_client.get_calls[0]["params"] == {"timeSpan": "45", "transportModes": "tram,bus,ferry,boat"}


@pytest.mark.anyio
async def test_fetch_arrivals_sends_auth_key_when_configured():
    client = VasttrafikClient(
        token_url="https://ext-api.vasttrafik.se/token",
        api_base_url="https://ext-api.vasttrafik.se/pr/v4",
        client_id="id",
        client_secret="secret",
        auth_key="auth-key",
    )
    http_client = FakeHttpClient()

    await client.fetch_arrivals(http_client, "9021014001760000")

    assert http_client.get_calls[0]["url"] == "https://ext-api.vasttrafik.se/pr/v4/stop-areas/9021014001760000/arrivals"
    assert http_client.get_calls[0]["headers"]["Authorization"] == "Bearer token-123"
    assert http_client.get_calls[0]["headers"]["Ocp-Apim-Subscription-Key"] == "auth-key"
    assert http_client.get_calls[0]["params"] == {"timeSpan": "45", "transportModes": "tram,bus,ferry,boat"}


@pytest.mark.anyio
async def test_fetch_arrivals_omits_auth_key_when_not_set():
    client = VasttrafikClient(
        token_url="https://ext-api.vasttrafik.se/token",
        api_base_url="https://ext-api.vasttrafik.se/pr/v4",
        client_id="id",
        client_secret="secret",
        auth_key="",
    )
    http_client = FakeHttpClient()

    await client.fetch_arrivals(http_client, "9021014001760000")

    assert http_client.get_calls[0]["url"] == "https://ext-api.vasttrafik.se/pr/v4/stop-areas/9021014001760000/arrivals"
    assert http_client.get_calls[0]["headers"] == {"Authorization": "Bearer token-123"}
    assert http_client.get_calls[0]["params"] == {"timeSpan": "45", "transportModes": "tram,bus,ferry,boat"}
