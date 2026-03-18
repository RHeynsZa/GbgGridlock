#!/usr/bin/env python3
"""Test if ferry stops are being missed due to transportModes filter."""

import asyncio
import json
import os
import sys


async def test_ferry_data():
    import httpx
    
    client_id = os.getenv("VT_CLIENT_ID", "")
    client_secret = os.getenv("VT_CLIENT_SECRET", "")
    auth_key = os.getenv("VT_AUTH_KEY", "")
    
    if not client_id or not client_secret:
        print("ERROR: Missing credentials")
        sys.exit(1)
    
    token_url = "https://ext-api.vasttrafik.se/token"
    api_base_url = "https://ext-api.vasttrafik.se/pr/v4"
    
    # Test with a stop that likely has ferries (Stenpiren is a ferry terminal)
    # Let's try Järntorget which is near Stenpiren
    test_stops = [
        ("9021014003610000", "Järntorget"),
        ("9021014001760000", "Centralstationen"),
    ]
    
    async with httpx.AsyncClient() as client:
        # Get token
        token_headers = {}
        if auth_key:
            token_headers["Ocp-Apim-Subscription-Key"] = auth_key
        
        token_response = await client.post(
            token_url,
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
            headers=token_headers or None,
            timeout=20.0,
        )
        token_response.raise_for_status()
        access_token = token_response.json()["access_token"]
        
        request_headers = {"Authorization": f"Bearer {access_token}"}
        if auth_key:
            request_headers["Ocp-Apim-Subscription-Key"] = auth_key
        
        for stop_gid, stop_name in test_stops:
            print(f"\n{'=' * 80}")
            print(f"Testing: {stop_name} ({stop_gid})")
            print('=' * 80)
            
            # Test WITH filter (current implementation)
            print("\n1. WITH transportModes filter (tram,bus) - CURRENT IMPLEMENTATION:")
            response_filtered = await client.get(
                f"{api_base_url}/stop-areas/{stop_gid}/departures",
                params={"timeSpan": "45", "transportModes": "tram,bus"},
                headers=request_headers,
                timeout=20.0,
            )
            data_filtered = response_filtered.json()
            departures_filtered = data_filtered.get("results", [])
            
            modes_filtered = {}
            for dep in departures_filtered:
                mode = dep.get("serviceJourney", {}).get("line", {}).get("transportMode", "unknown")
                modes_filtered[mode] = modes_filtered.get(mode, 0) + 1
            
            print(f"   Total departures: {len(departures_filtered)}")
            print(f"   Transport modes: {dict(modes_filtered)}")
            
            # Test WITHOUT filter
            print("\n2. WITHOUT transportModes filter - CORRECT IMPLEMENTATION:")
            response_unfiltered = await client.get(
                f"{api_base_url}/stop-areas/{stop_gid}/departures",
                params={"timeSpan": "45"},
                headers=request_headers,
                timeout=20.0,
            )
            data_unfiltered = response_unfiltered.json()
            departures_unfiltered = data_unfiltered.get("results", [])
            
            modes_unfiltered = {}
            for dep in departures_unfiltered:
                mode = dep.get("serviceJourney", {}).get("line", {}).get("transportMode", "unknown")
                modes_unfiltered[mode] = modes_unfiltered.get(mode, 0) + 1
            
            print(f"   Total departures: {len(departures_unfiltered)}")
            print(f"   Transport modes: {dict(modes_unfiltered)}")
            
            # Compare
            missing = len(departures_unfiltered) - len(departures_filtered)
            if missing > 0:
                print(f"\n⚠️  MISSING {missing} DEPARTURES DUE TO FILTER!")
                
                # Show which lines are being missed
                lines_filtered = {dep.get("serviceJourney", {}).get("line", {}).get("shortName") 
                                for dep in departures_filtered}
                lines_unfiltered = {dep.get("serviceJourney", {}).get("line", {}).get("shortName") 
                                  for dep in departures_unfiltered}
                missing_lines = lines_unfiltered - lines_filtered
                
                if missing_lines:
                    print(f"   Missing lines: {sorted(missing_lines)}")
                    
                    # Show transport modes of missing lines
                    for dep in departures_unfiltered:
                        line_num = dep.get("serviceJourney", {}).get("line", {}).get("shortName")
                        if line_num in missing_lines:
                            mode = dep.get("serviceJourney", {}).get("line", {}).get("transportMode")
                            print(f"     Line {line_num}: {mode}")
                            missing_lines.remove(line_num)
                            if not missing_lines:
                                break
    
    print("\n" + "=" * 80)
    print("CONCLUSION")
    print("=" * 80)
    print("\n✗ ISSUE FOUND: The current implementation filters to only 'tram,bus'")
    print("  This means ferry/boat departures are being EXCLUDED from the data.")
    print("\n✓ SOLUTION: Remove the transportModes filter parameter from the API call")
    print("  and let the code filter based on ALLOWED_TRANSPORT_MODES after parsing.")
    print("\nThe API provides correct transportMode data - we just need to stop")
    print("filtering it at the API level and instead filter in our code!")


if __name__ == "__main__":
    asyncio.run(test_ferry_data())
