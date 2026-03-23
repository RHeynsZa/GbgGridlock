"""
Stop resolver module for looking up stop area GIDs from the Västtrafik API.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone

import asyncpg
import httpx

from gbg_gridlock_api.vasttrafik_client import VasttrafikClient


@dataclass
class ResolvedStop:
    stop_name: str
    stop_gid: str
    last_verified_at: datetime


async def resolve_stop_gid(
    client: VasttrafikClient,
    http_client: httpx.AsyncClient,
    stop_name: str,
) -> str | None:
    """
    Resolve a stop name to its stop area GID using the Västtrafik API.
    
    Returns the stop area GID if found, None otherwise.
    """
    try:
        # Get token
        token = await client._ensure_token(http_client)
        
        request_headers = {"Authorization": f"Bearer {token}"}
        if client._auth_key:
            request_headers["Ocp-Apim-Subscription-Key"] = client._auth_key
        
        # Search for the stop using the locations endpoint
        response = await http_client.get(
            f"{client._api_base_url}/locations/by-text",
            params={"q": stop_name, "limit": "10"},
            headers=request_headers,
            timeout=20.0,
        )
        response.raise_for_status()
        data = response.json()
        
        if "results" not in data or not data["results"]:
            return None
        
        # Look for an exact match (case-insensitive) with locationType "stoparea"
        for result in data["results"]:
            result_name = result.get("name", "")
            location_type = result.get("locationType", "").lower()
            
            # Exact match on name and must be a stop area
            if result_name.lower() == stop_name.lower() and location_type == "stoparea":
                return result.get("gid")
        
        # If no exact match, try to find a stop area that contains the name
        for result in data["results"]:
            result_name = result.get("name", "")
            location_type = result.get("locationType", "").lower()
            
            if location_type == "stoparea" and stop_name.lower() in result_name.lower():
                return result.get("gid")
        
        return None
        
    except Exception as e:
        print(f"Error resolving stop '{stop_name}': {e}")
        return None


async def upsert_monitored_stop(
    conn: asyncpg.Connection,
    stop_name: str,
    stop_gid: str,
) -> None:
    """
    Insert or update a monitored stop in the database.
    """
    await conn.execute(
        """
        INSERT INTO monitored_stops (stop_name, stop_gid, last_verified_at, updated_at)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (stop_name)
        DO UPDATE SET
            stop_gid = EXCLUDED.stop_gid,
            last_verified_at = EXCLUDED.last_verified_at,
            updated_at = EXCLUDED.updated_at
        """,
        stop_name,
        stop_gid,
        datetime.now(timezone.utc),
    )


async def get_monitored_stops(conn: asyncpg.Connection) -> list[ResolvedStop]:
    """
    Get all monitored stops from the database.
    """
    rows = await conn.fetch(
        """
        SELECT stop_name, stop_gid, last_verified_at
        FROM monitored_stops
        ORDER BY stop_name
        """
    )
    
    return [
        ResolvedStop(
            stop_name=row["stop_name"],
            stop_gid=row["stop_gid"],
            last_verified_at=row["last_verified_at"],
        )
        for row in rows
    ]


async def resolve_and_store_stops(
    client: VasttrafikClient,
    db_pool: asyncpg.Pool,
    stop_names: tuple[str, ...],
) -> list[ResolvedStop]:
    """
    Resolve stop names to GIDs and store them in the database.
    
    Returns the list of resolved stops.
    """
    resolved_stops = []
    
    async with httpx.AsyncClient() as http_client:
        for stop_name in stop_names:
            print(f"Resolving stop: {stop_name}")
            
            stop_gid = await resolve_stop_gid(client, http_client, stop_name)
            
            if stop_gid:
                print(f"  ✓ Found: {stop_gid}")
                
                async with db_pool.acquire() as conn:
                    await upsert_monitored_stop(conn, stop_name, stop_gid)
                
                resolved_stops.append(
                    ResolvedStop(
                        stop_name=stop_name,
                        stop_gid=stop_gid,
                        last_verified_at=datetime.now(timezone.utc),
                    )
                )
            else:
                print(f"  ✗ Could not resolve stop: {stop_name}")
            
            # Be nice to the API
            await asyncio.sleep(0.5)
    
    return resolved_stops
