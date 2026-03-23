#!/usr/bin/env python3
"""
Script to search for stop areas in the Västtrafik API by name.
This helps find the correct stop area GID for a given stop name.
"""
import asyncio
import os
import sys

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "src"))

from gbg_gridlock_api.vasttrafik_client import VasttrafikClient


async def search_stop_by_name(client: VasttrafikClient, http_client: httpx.AsyncClient, stop_name: str):
    """Search for a stop by name using the Västtrafik API."""
    print(f"\n{'='*80}")
    print(f"Searching for: {stop_name}")
    print(f"{'='*80}")
    
    try:
        # Get token
        token = await client._ensure_token(http_client)
        
        # Search for the stop using the locations endpoint
        request_headers = {"Authorization": f"Bearer {token}"}
        if client._auth_key:
            request_headers["Ocp-Apim-Subscription-Key"] = client._auth_key
        
        response = await http_client.get(
            f"{client._api_base_url}/locations/by-text",
            params={"q": stop_name, "limit": "10"},
            headers=request_headers,
            timeout=20.0,
        )
        response.raise_for_status()
        data = response.json()
        
        if "results" not in data or not data["results"]:
            print(f"⚠️  No results found for '{stop_name}'")
            return []
        
        print(f"Found {len(data['results'])} results:")
        print("-" * 80)
        
        results = []
        for i, result in enumerate(data["results"], 1):
            gid = result.get("gid", "N/A")
            name = result.get("name", "N/A")
            location_type = result.get("locationType", "N/A")
            
            print(f"\n{i}. {name}")
            print(f"   GID: {gid}")
            print(f"   Type: {location_type}")
            
            if "stopArea" in result:
                stop_area = result["stopArea"]
                print(f"   Stop Area GID: {stop_area.get('gid', 'N/A')}")
                print(f"   Stop Area Name: {stop_area.get('name', 'N/A')}")
            
            results.append(result)
        
        return results
        
    except httpx.HTTPStatusError as e:
        print(f"❌ ERROR: HTTP {e.response.status_code}")
        print(f"Response: {e.response.text}")
        return []
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        return []


async def get_stop_details(client: VasttrafikClient, http_client: httpx.AsyncClient, stop_gid: str):
    """Get detailed information about a specific stop area."""
    print(f"\n{'='*80}")
    print(f"Getting details for stop GID: {stop_gid}")
    print(f"{'='*80}")
    
    try:
        # Get token
        token = await client._ensure_token(http_client)
        
        request_headers = {"Authorization": f"Bearer {token}"}
        if client._auth_key:
            request_headers["Ocp-Apim-Subscription-Key"] = client._auth_key
        
        # Get stop area details
        response = await http_client.get(
            f"{client._api_base_url}/stop-areas/{stop_gid}",
            headers=request_headers,
            timeout=20.0,
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"Name: {data.get('name', 'N/A')}")
        print(f"GID: {data.get('gid', 'N/A')}")
        print(f"Municipality: {data.get('municipality', 'N/A')}")
        
        if "stopPoints" in data:
            print(f"\nStop Points ({len(data['stopPoints'])}):")
            for sp in data["stopPoints"]:
                print(f"  - {sp.get('name', 'N/A')} (GID: {sp.get('gid', 'N/A')})")
        
        return data
        
    except httpx.HTTPStatusError as e:
        print(f"❌ ERROR: HTTP {e.response.status_code}")
        print(f"Response: {e.response.text}")
        return None
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        return None


async def main():
    """Main function."""
    client_id = os.getenv("VT_CLIENT_ID", "")
    client_secret = os.getenv("VT_CLIENT_SECRET", "")
    auth_key = os.getenv("VT_AUTH_KEY", "")
    
    if not client_id or not client_secret:
        print("❌ ERROR: VT_CLIENT_ID and VT_CLIENT_SECRET environment variables are required")
        print("\nPlease set them:")
        print("  export VT_CLIENT_ID='your_client_id'")
        print("  export VT_CLIENT_SECRET='your_client_secret'")
        print("  export VT_AUTH_KEY='your_subscription_key'  # if required")
        sys.exit(1)
    
    client = VasttrafikClient(
        token_url="https://ext-api.vasttrafik.se/token",
        api_base_url="https://ext-api.vasttrafik.se/pr/v4",
        client_id=client_id,
        client_secret=client_secret,
        auth_key=auth_key,
    )
    
    stops_to_search = [
        "Redbergsplatsen",
        "Hjalmar Brantingsplatsen",
        "Centralstationen",
        "Korsvägen",
        "Järntorget",
        "Marklandsgatan",
    ]
    
    async with httpx.AsyncClient() as http_client:
        for stop_name in stops_to_search:
            await search_stop_by_name(client, http_client, stop_name)
            await asyncio.sleep(1)
        
        # Also check the specific GIDs we're currently using
        print("\n\n" + "=" * 80)
        print("CHECKING CURRENT GIDS FROM monitored_stops.py")
        print("=" * 80)
        
        current_gids = {
            "Centralstationen": "9021014001760000",
            "Redbergsplatsen": "9021014005650000",
            "Korsvägen": "9021014002510000",
            "Järntorget": "9021014003610000",
            "Marklandsgatan": "9021014004490000",
            "Hjalmar Brantingsplatsen": "9021014003100000",
        }
        
        for name, gid in current_gids.items():
            await get_stop_details(client, http_client, gid)
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
