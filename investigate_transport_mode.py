#!/usr/bin/env python3
"""
Script to investigate how to determine transport type from the Västtrafik API.

This script will make a real API call and print the response structure to help us
understand what fields are available for determining transport mode (tram, bus, ferry, etc.).
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone


async def investigate_api():
    """Make a test API call and analyze the response structure."""
    import httpx
    
    # Get credentials from environment
    client_id = os.getenv("VT_CLIENT_ID", "")
    client_secret = os.getenv("VT_CLIENT_SECRET", "")
    auth_key = os.getenv("VT_AUTH_KEY", "")
    
    if not client_id or not client_secret:
        print("ERROR: VT_CLIENT_ID and VT_CLIENT_SECRET environment variables are required")
        print("\nTo run this script, set the environment variables:")
        print("  export VT_CLIENT_ID='your_client_id'")
        print("  export VT_CLIENT_SECRET='your_client_secret'")
        print("  export VT_AUTH_KEY='your_subscription_key'  # Optional")
        sys.exit(1)
    
    token_url = "https://ext-api.vasttrafik.se/token"
    api_base_url = "https://ext-api.vasttrafik.se/pr/v4"
    
    # Use Centralstationen as test stop (major transit hub with trams and buses)
    test_stop_gid = "9021014001760000"
    
    print("=" * 80)
    print("Investigating Västtrafik API transport type determination")
    print("=" * 80)
    print(f"\nTest stop: {test_stop_gid} (Centralstationen)")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()
    
    async with httpx.AsyncClient() as client:
        # Step 1: Get OAuth token
        print("Step 1: Requesting OAuth token...")
        token_headers = {}
        if auth_key:
            token_headers["Ocp-Apim-Subscription-Key"] = auth_key
        
        try:
            token_response = await client.post(
                token_url,
                data={"grant_type": "client_credentials"},
                auth=(client_id, client_secret),
                headers=token_headers or None,
                timeout=20.0,
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            access_token = token_data["access_token"]
            print("✓ Token obtained successfully")
        except Exception as e:
            print(f"✗ Failed to get token: {e}")
            sys.exit(1)
        
        # Step 2: Fetch departures
        print("\nStep 2: Fetching departures from API...")
        request_headers = {"Authorization": f"Bearer {access_token}"}
        if auth_key:
            request_headers["Ocp-Apim-Subscription-Key"] = auth_key
        
        try:
            # Try WITHOUT transportModes filter first to see everything
            response = await client.get(
                f"{api_base_url}/stop-areas/{test_stop_gid}/departures",
                params={"timeSpan": "45"},
                headers=request_headers,
                timeout=20.0,
            )
            response.raise_for_status()
            data = response.json()
            print("✓ Departures fetched successfully")
        except Exception as e:
            print(f"✗ Failed to fetch departures: {e}")
            sys.exit(1)
        
        # Step 3: Analyze the response structure
        print("\n" + "=" * 80)
        print("ANALYSIS OF API RESPONSE")
        print("=" * 80)
        
        # Get the departures list
        departures = data.get("results") or data.get("departures") or []
        print(f"\nTotal departures returned: {len(departures)}")
        
        if not departures:
            print("\n⚠ No departures found in response!")
            print("\nFull response:")
            print(json.dumps(data, indent=2))
            return
        
        # Analyze first few departures to understand structure
        print("\n" + "-" * 80)
        print("SAMPLE DEPARTURES (first 5)")
        print("-" * 80)
        
        transport_type_fields_found = set()
        
        for i, dep in enumerate(departures[:5], 1):
            print(f"\n[Departure {i}]")
            
            # Extract line information
            line_obj = dep.get("serviceJourney", {}).get("line") or dep.get("line") or {}
            line_number = line_obj.get("shortName") or line_obj.get("name") or "?"
            
            print(f"  Line: {line_number}")
            
            # Check all possible locations for transport mode
            checks = [
                ("serviceJourney.line.transportMode", dep.get("serviceJourney", {}).get("line", {}).get("transportMode")),
                ("serviceJourney.line.transportSubMode", dep.get("serviceJourney", {}).get("line", {}).get("transportSubMode")),
                ("serviceJourney.transportMode", dep.get("serviceJourney", {}).get("transportMode")),
                ("serviceJourney.transportSubMode", dep.get("serviceJourney", {}).get("transportSubMode")),
                ("line.transportMode", dep.get("line", {}).get("transportMode")),
                ("line.transportSubMode", dep.get("line", {}).get("transportSubMode")),
                ("transportMode", dep.get("transportMode")),
                ("transportSubMode", dep.get("transportSubMode")),
            ]
            
            found_any = False
            for field_path, value in checks:
                if value is not None:
                    print(f"  ✓ {field_path}: {value}")
                    transport_type_fields_found.add(field_path)
                    found_any = True
            
            if not found_any:
                print("  ✗ No transport mode fields found!")
            
            # Show the full structure for the first departure
            if i == 1:
                print("\n  Full structure of first departure:")
                print("  " + "-" * 76)
                # Print with indentation
                for line in json.dumps(dep, indent=4).split('\n'):
                    print("  " + line)
        
        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"\nTotal departures analyzed: {min(5, len(departures))}")
        
        if transport_type_fields_found:
            print("\n✓ Transport mode fields found in API:")
            for field in sorted(transport_type_fields_found):
                print(f"  - {field}")
        else:
            print("\n✗ NO transport mode fields found in API response!")
            print("\nThis means the API does NOT provide transport type information.")
            print("You will need to use a fallback heuristic based on line numbers.")
        
        # Collect unique transport modes
        print("\n" + "-" * 80)
        print("TRANSPORT MODES BY LINE NUMBER")
        print("-" * 80)
        
        line_transport_map = {}
        for dep in departures:
            line_obj = dep.get("serviceJourney", {}).get("line") or dep.get("line") or {}
            line_number = line_obj.get("shortName") or line_obj.get("name")
            if not line_number:
                continue
            
            # Try to get transport mode from various locations
            transport_mode = (
                dep.get("serviceJourney", {}).get("line", {}).get("transportMode") or
                dep.get("serviceJourney", {}).get("line", {}).get("transportSubMode") or
                dep.get("serviceJourney", {}).get("transportMode") or
                dep.get("serviceJourney", {}).get("transportSubMode") or
                dep.get("line", {}).get("transportMode") or
                dep.get("line", {}).get("transportSubMode") or
                dep.get("transportMode") or
                dep.get("transportSubMode") or
                "UNKNOWN"
            )
            
            if line_number not in line_transport_map:
                line_transport_map[line_number] = transport_mode
        
        # Group by transport mode
        by_mode = {}
        for line, mode in sorted(line_transport_map.items()):
            if mode not in by_mode:
                by_mode[mode] = []
            by_mode[mode].append(line)
        
        for mode, lines in sorted(by_mode.items()):
            print(f"\n{mode}:")
            print(f"  Lines: {', '.join(sorted(lines, key=lambda x: (not x.isdigit(), int(x) if x.isdigit() else 0, x)))}")
        
        print("\n" + "=" * 80)
        print("RECOMMENDATIONS")
        print("=" * 80)
        
        if transport_type_fields_found:
            print("\n✓ The API provides transport mode information!")
            print("\nYour current code correctly looks for:")
            for field in sorted(transport_type_fields_found):
                print(f"  - {field}")
            print("\nMake sure your code is checking these fields in the right order.")
        else:
            print("\n⚠ The API does NOT provide transport mode information.")
            print("\nYou MUST use a fallback heuristic based on line numbers:")
            print("  - Lines 1-13: Tram")
            print("  - Lines 2XX: Ferry/Boat")
            print("  - All others: Bus")
            print("\nThis is what your current code already does!")
        
        # Save full response to file for detailed inspection
        output_file = "/workspace/api_response_sample.json"
        with open(output_file, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n📄 Full API response saved to: {output_file}")
        
        print("\n" + "=" * 80)


if __name__ == "__main__":
    asyncio.run(investigate_api())
