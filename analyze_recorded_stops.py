#!/usr/bin/env python3
"""
Script to analyze what lines have been recorded for each monitored stop.
This helps verify if the stop IDs are correct by checking actual data.
"""
import asyncio
import os
import sys
from collections import defaultdict

import asyncpg

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "src"))

from gbg_gridlock_api.monitored_stops import MONITORED_STOPS


async def analyze_stop_data(conn: asyncpg.Connection):
    """Analyze the recorded data for each monitored stop."""
    print("=" * 80)
    print("ANALYZING RECORDED STOP DATA")
    print("=" * 80)
    
    # Check if we have any data at all
    total_count = await conn.fetchval("SELECT COUNT(*) FROM departure_delay_events")
    print(f"\nTotal departure events recorded: {total_count:,}")
    
    if total_count == 0:
        print("\n⚠️  No data in database yet. The worker may not have run yet.")
        return
    
    # Get date range
    date_range = await conn.fetchrow(
        "SELECT MIN(recorded_at) as earliest, MAX(recorded_at) as latest FROM departure_delay_events"
    )
    print(f"Data range: {date_range['earliest']} to {date_range['latest']}")
    
    print("\n" + "=" * 80)
    print("LINES BY STOP")
    print("=" * 80)
    
    for stop in MONITORED_STOPS:
        print(f"\n{stop.stop_name} (GID: {stop.stop_gid})")
        print("-" * 80)
        
        # Get count of events for this stop
        stop_count = await conn.fetchval(
            "SELECT COUNT(*) FROM departure_delay_events WHERE stop_gid = $1",
            stop.stop_gid
        )
        
        if stop_count == 0:
            print("⚠️  No data recorded for this stop")
            continue
        
        print(f"Total events: {stop_count:,}")
        
        # Get unique lines at this stop
        lines = await conn.fetch(
            """
            SELECT 
                line_number,
                COUNT(*) as event_count,
                AVG(delay_seconds) as avg_delay,
                MAX(delay_seconds) as max_delay,
                MIN(recorded_at) as first_seen,
                MAX(recorded_at) as last_seen
            FROM departure_delay_events
            WHERE stop_gid = $1
            GROUP BY line_number
            ORDER BY event_count DESC
            """,
            stop.stop_gid
        )
        
        if lines:
            print(f"\nLines observed ({len(lines)} unique lines):")
            for line in lines:
                avg_delay = line['avg_delay'] if line['avg_delay'] is not None else 0
                max_delay = line['max_delay'] if line['max_delay'] is not None else 0
                print(f"  {line['line_number']:>6s}: {line['event_count']:>6,} events | "
                      f"Avg delay: {avg_delay:>6.1f}s | Max: {max_delay:>6}s | "
                      f"Last seen: {line['last_seen']}")
    
    # Show stops with no data
    print("\n" + "=" * 80)
    print("STOPS WITH NO DATA")
    print("=" * 80)
    
    stops_with_data = await conn.fetch(
        "SELECT DISTINCT stop_gid FROM departure_delay_events"
    )
    recorded_gids = {row['stop_gid'] for row in stops_with_data}
    monitored_gids = {stop.stop_gid for stop in MONITORED_STOPS}
    
    missing_gids = monitored_gids - recorded_gids
    if missing_gids:
        print("\nThe following monitored stops have NO recorded data:")
        for stop in MONITORED_STOPS:
            if stop.stop_gid in missing_gids:
                print(f"  - {stop.stop_name} (GID: {stop.stop_gid})")
    else:
        print("\n✓ All monitored stops have recorded data")
    
    # Check for unexpected stop GIDs in the data
    unexpected_gids = recorded_gids - monitored_gids
    if unexpected_gids:
        print("\n⚠️  WARNING: Found data for unexpected stop GIDs:")
        for gid in unexpected_gids:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM departure_delay_events WHERE stop_gid = $1",
                gid
            )
            print(f"  - {gid}: {count:,} events")


async def check_transport_modes(conn: asyncpg.Connection):
    """Check if transport_mode column exists and analyze it."""
    print("\n" + "=" * 80)
    print("TRANSPORT MODE ANALYSIS")
    print("=" * 80)
    
    # Check if transport_mode column exists
    has_transport_mode = await conn.fetchval(
        """
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'departure_delay_events' 
            AND column_name = 'transport_mode'
        )
        """
    )
    
    if not has_transport_mode:
        print("\n⚠️  transport_mode column does not exist in the database")
        return
    
    # Analyze transport modes by stop
    for stop in MONITORED_STOPS:
        modes = await conn.fetch(
            """
            SELECT 
                transport_mode,
                COUNT(*) as count,
                COUNT(DISTINCT line_number) as unique_lines
            FROM departure_delay_events
            WHERE stop_gid = $1
            GROUP BY transport_mode
            ORDER BY count DESC
            """,
            stop.stop_gid
        )
        
        if modes:
            print(f"\n{stop.stop_name}:")
            for mode in modes:
                print(f"  {mode['transport_mode']}: {mode['count']:,} events, "
                      f"{mode['unique_lines']} unique lines")


async def main():
    """Main function."""
    database_url = os.getenv("DATABASE_URL", "postgresql://gbg:gbg@localhost:5432/gbggridlock")
    
    print(f"Connecting to database: {database_url.split('@')[1] if '@' in database_url else database_url}")
    
    try:
        conn = await asyncpg.connect(database_url)
        
        try:
            await analyze_stop_data(conn)
            await check_transport_modes(conn)
            
            print("\n" + "=" * 80)
            print("ANALYSIS COMPLETE")
            print("=" * 80)
            print("\nNext steps:")
            print("1. Review the lines recorded for each stop")
            print("2. Compare with expected lines for Redbergsplatsen and Hjalmar Brantingsplatsen")
            print("3. If no data or unexpected lines, the stop GIDs may be incorrect")
            print("4. Use search_stop_ids.py to find the correct GIDs")
            
        finally:
            await conn.close()
            
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
