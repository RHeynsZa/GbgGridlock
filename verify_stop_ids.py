#!/usr/bin/env python3
"""
Verification script to check if the stop IDs in monitored_stops.py are correct.
This script queries the Västtrafik API for each stop and displays what lines are available.
"""
import asyncio
import os
import sys
from collections import defaultdict

import httpx

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "src"))

from gbg_gridlock_api.monitored_stops import MONITORED_STOPS
from gbg_gridlock_api.vasttrafik_client import VasttrafikClient


async def verify_stop_id(client: VasttrafikClient, http_client: httpx.AsyncClient, stop_gid: str, stop_name: str):
    """Verify a single stop ID by fetching its departures and analyzing available lines."""
    print(f"\n{'='*80}")
    print(f"Verifying: {stop_name} (GID: {stop_gid})")
    print(f"{'='*80}")
    
    try:
        data = await client.fetch_departures(http_client, stop_gid, time_span=120)
        
        if "results" not in data or not data["results"]:
            print(f"⚠️  WARNING: No departures found for {stop_name}")
            return
        
        # Analyze the departures
        lines_by_transport = defaultdict(set)
        total_departures = len(data["results"])
        
        for departure in data["results"]:
            service_journey = departure.get("serviceJourney", {})
            line_number = service_journey.get("line", {}).get("name", "UNKNOWN")
            transport_mode = service_journey.get("line", {}).get("transportMode", "UNKNOWN")
            transport_submode = service_journey.get("line", {}).get("transportSubMode", "")
            
            # Create a descriptive key
            mode_key = transport_mode
            if transport_submode:
                mode_key = f"{transport_mode} ({transport_submode})"
            
            lines_by_transport[mode_key].add(line_number)
        
        print(f"✓ Found {total_departures} departures in the next 120 minutes")
        print(f"\nLines available at {stop_name}:")
        print("-" * 80)
        
        for transport_mode in sorted(lines_by_transport.keys()):
            lines = sorted(lines_by_transport[transport_mode], key=lambda x: (not x.isdigit(), int(x) if x.isdigit() else 0, x))
            print(f"\n  {transport_mode}:")
            print(f"    {', '.join(lines)}")
        
        # Show sample departure for verification
        if data["results"]:
            sample = data["results"][0]
            sj = sample.get("serviceJourney", {})
            print(f"\n  Sample departure:")
            print(f"    Line: {sj.get('line', {}).get('name', 'N/A')}")
            print(f"    Direction: {sj.get('direction', 'N/A')}")
            print(f"    Planned: {sample.get('plannedTime', 'N/A')}")
            
    except httpx.HTTPStatusError as e:
        print(f"❌ ERROR: HTTP {e.response.status_code} - {e.response.text}")
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")


async def main():
    """Main verification function."""
    # Check for credentials
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
    
    print("=" * 80)
    print("VÄSTTRAFIK STOP ID VERIFICATION")
    print("=" * 80)
    print(f"Checking {len(MONITORED_STOPS)} monitored stops...")
    
    client = VasttrafikClient(
        token_url="https://ext-api.vasttrafik.se/token",
        api_base_url="https://ext-api.vasttrafik.se/pr/v4",
        client_id=client_id,
        client_secret=client_secret,
        auth_key=auth_key,
    )
    
    async with httpx.AsyncClient() as http_client:
        for stop in MONITORED_STOPS:
            await verify_stop_id(client, http_client, stop.stop_gid, stop.stop_name)
            await asyncio.sleep(1)  # Be nice to the API
    
    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE")
    print("=" * 80)
    print("\nNext steps:")
    print("1. Review the lines available at each stop")
    print("2. Check if Redbergsplatsen and Hjalmar Brantingsplatsen have expected lines")
    print("3. If stop IDs are incorrect, search for the correct ones using the Västtrafik API")


if __name__ == "__main__":
    asyncio.run(main())
