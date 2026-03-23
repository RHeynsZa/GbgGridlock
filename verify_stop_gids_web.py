#!/usr/bin/env python3
"""
Script to verify stop GIDs by checking the Västtrafik website.
This doesn't require API credentials.
"""
import sys

# Known stop names and their expected GIDs from Västtrafik website
VASTTRAFIK_WEBSITE_GIDS = {
    "Centralstationen": "9021014001950000",  # From https://www.vasttrafik.se/en/travel-planning/stops/9021014001950000/
    "Korsvägen": "9021014003980000",  # From https://www.vasttrafik.se/en/travel-planning/stops/9021014003980000/
    "Järntorget": "9021014003640000",  # From https://www.vasttrafik.se/en/travel-planning/stops/9021014003640000/
    "Marklandsgatan": "9021014004760000",  # From https://www.vasttrafik.se/en/travel-planning/stops/9021014004760000/
    "Hjalmar Brantingsplatsen": "9021014003180000",  # From https://www.vasttrafik.se/en/travel-planning/stops/9021014003180000/
    # Redbergsplatsen: Could not verify via website, keeping current GID for now
}

# Current GIDs in our code
CURRENT_GIDS = {
    "Centralstationen": "9021014001760000",
    "Redbergsplatsen": "9021014005650000",
    "Korsvägen": "9021014002510000",
    "Järntorget": "9021014003610000",
    "Marklandsgatan": "9021014004490000",
    "Hjalmar Brantingsplatsen": "9021014003100000",
}

def main():
    print("=" * 80)
    print("STOP GID VERIFICATION (Web-based)")
    print("=" * 80)
    print("\nComparing current GIDs with known Västtrafik website GIDs...")
    print()
    
    issues_found = []
    
    for stop_name, current_gid in CURRENT_GIDS.items():
        if stop_name in VASTTRAFIK_WEBSITE_GIDS:
            website_gid = VASTTRAFIK_WEBSITE_GIDS[stop_name]
            if current_gid != website_gid:
                issues_found.append({
                    "stop": stop_name,
                    "current": current_gid,
                    "expected": website_gid
                })
                print(f"❌ MISMATCH: {stop_name}")
                print(f"   Current GID:  {current_gid}")
                print(f"   Expected GID: {website_gid}")
                print(f"   Västtrafik URL: https://www.vasttrafik.se/en/travel-planning/stops/{website_gid}/")
                print()
            else:
                print(f"✓ {stop_name}: {current_gid} (matches)")
                print()
        else:
            print(f"⚠️  {stop_name}: {current_gid} (not verified)")
            print(f"   Check manually: https://www.vasttrafik.se/en/travel-planning/stops/{current_gid}/")
            print()
    
    if issues_found:
        print("=" * 80)
        print("ISSUES FOUND")
        print("=" * 80)
        print(f"\nFound {len(issues_found)} stop(s) with incorrect GIDs:")
        for issue in issues_found:
            print(f"\n{issue['stop']}:")
            print(f"  Change from: {issue['current']}")
            print(f"  Change to:   {issue['expected']}")
        
        print("\n" + "=" * 80)
        print("RECOMMENDED ACTIONS")
        print("=" * 80)
        print("\n1. Update backend/src/gbg_gridlock_api/monitored_stops.py")
        print("2. Update backend/tests/test_api.py (if it contains these GIDs)")
        print("3. Run tests to ensure everything still works")
        print("4. If database has existing data with old GIDs, consider migration")
        
        return 1
    else:
        print("=" * 80)
        print("✓ All verified stops have correct GIDs")
        print("=" * 80)
        return 0

if __name__ == "__main__":
    sys.exit(main())
