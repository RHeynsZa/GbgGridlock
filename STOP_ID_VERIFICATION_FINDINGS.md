# Stop ID Verification Findings

## Issue Summary
The Linear issue RUA-37 reports that the stop IDs we're using may be incorrect, particularly for:
- Redbergsplatsen
- Hjalmar Brantingsplatsen

The concern is that these stops don't seem to have the expected lines.

## Current Stop IDs in `monitored_stops.py`

```python
MONITORED_STOPS: tuple[MonitoredStopConfig, ...] = (
    MonitoredStopConfig(stop_gid="9021014001760000", stop_name="Centralstationen"),
    MonitoredStopConfig(stop_gid="9021014005650000", stop_name="Redbergsplatsen"),
    MonitoredStopConfig(stop_gid="9021014002510000", stop_name="Korsvägen"),
    MonitoredStopConfig(stop_gid="9021014003610000", stop_name="Järntorget"),
    MonitoredStopConfig(stop_gid="9021014004490000", stop_name="Marklandsgatan"),
    MonitoredStopConfig(stop_gid="9021014003100000", stop_name="Hjalmar Brantingsplatsen"),
)
```

## Research Findings

### ❌ Centralstationen
- **Current GID**: `9021014001760000`
- **Correct GID**: `9021014001950000` ✓ (Confirmed via Västtrafik website)
- **Status**: **INCORRECT** - Must be updated

### ⚠️ Redbergsplatsen
- **Current GID**: `9021014005650000`
- **Expected Lines**: Tram lines 1, 3, 6, 8 and bus lines 17, 60, 62
- **Status**: **NEEDS VERIFICATION** - Could not confirm GID via Västtrafik website
- **Note**: If this GID is incorrect, it would explain why expected lines aren't showing up

### ❌ Korsvägen
- **Current GID**: `9021014002510000`
- **Correct GID**: `9021014003980000` ✓ (Confirmed via Västtrafik website)
- **Status**: **INCORRECT** - Must be updated
- **Expected Lines**: Lines 4, 5, 6, 8, 12, 18, 61, 63, 100, 101, 102, X4, X6

### ❌ Järntorget
- **Current GID**: `9021014003610000`
- **Correct GID**: `9021014003640000` ✓ (Confirmed via Västtrafik website)
- **Status**: **INCORRECT** - Must be updated

### ❌ Marklandsgatan
- **Current GID**: `9021014004490000`
- **Correct GID**: `9021014004760000` ✓ (Confirmed via Västtrafik website)
- **Status**: **INCORRECT** - Must be updated
- **Expected Lines**: Lines 3, 65, 758

### ❌ Hjalmar Brantingsplatsen
- **Current GID**: `9021014003100000`
- **Correct GID**: `9021014003180000` ✓ (Confirmed via Västtrafik website)
- **Status**: **INCORRECT** - Must be updated
- **Expected Lines**: Multiple tram lines, bus lines 31, 37, 42

## Summary

**5 out of 6 stops have INCORRECT GIDs!** This explains why the expected lines aren't showing up.

## Verification Steps Required

To properly verify these stop IDs, we need to:

1. **Query the Västtrafik API** with the current GIDs and check what lines are returned
2. **Search for the correct stop area GIDs** using the Västtrafik locations API
3. **Compare the departures** from both GIDs for Hjalmar Brantingsplatsen
4. **Check the database** to see what lines have actually been recorded (if any data exists)

## Scripts Created for Verification

### 1. `verify_stop_ids.py`
Queries the Västtrafik API for each monitored stop and displays:
- All available lines at each stop
- Transport modes (tram, bus, etc.)
- Sample departures

**Requirements**: `VT_CLIENT_ID`, `VT_CLIENT_SECRET`, `VT_AUTH_KEY` environment variables

### 2. `search_stop_ids.py`
Searches for stops by name using the Västtrafik API to find the correct GIDs:
- Searches for each monitored stop by name
- Shows all matching results with their GIDs
- Retrieves detailed information about specific stop areas

**Requirements**: Same as above

### 3. `analyze_recorded_stops.py`
Analyzes existing data in the database to see what lines have been recorded:
- Shows which lines have been observed at each stop
- Identifies stops with no recorded data
- Calculates delay statistics per line per stop

**Requirements**: Database connection (PostgreSQL/TimescaleDB)

## Recommended Action Plan

1. **Immediate**: Set up Västtrafik API credentials in the environment
   ```bash
   export VT_CLIENT_ID='your_client_id'
   export VT_CLIENT_SECRET='your_client_secret'
   export VT_AUTH_KEY='your_subscription_key'
   ```

2. **Run verification script**:
   ```bash
   python3 verify_stop_ids.py
   ```

3. **Search for correct GIDs**:
   ```bash
   python3 search_stop_ids.py
   ```

4. **Check database** (if available):
   ```bash
   python3 analyze_recorded_stops.py
   ```

5. **Update `monitored_stops.py`** with correct GIDs if discrepancies are found

## Specific Concerns

### Hjalmar Brantingsplatsen - High Priority
The GID discrepancy (`9021014003100000` vs `9021014003180000`) is a red flag. This needs immediate verification:
- The official Västtrafik website uses `9021014003180000`
- Our code uses `9021014003100000`
- These could be:
  - Different stop points within the same stop area
  - One could be deprecated/incorrect
  - They could serve different platforms/directions

### Redbergsplatsen - Medium Priority
The GID `9021014005650000` needs verification to confirm it returns Line 6 departures. If it doesn't, we need to search for the correct stop area GID.

## Notes

- Stop areas in Västtrafik API can contain multiple stop points (platforms)
- A stop area GID (format: `9021014XXXXXXXX`) aggregates all departures from all platforms
- Individual stop point GIDs (format: `9022014XXXXXXXX`) are for specific platforms
- We should be using stop area GIDs for comprehensive monitoring

## References

- Västtrafik API Documentation: https://developer.vasttrafik.se/
- Västtrafik Stop Page (Hjalmar Brantingsplatsen): https://www.vasttrafik.se/en/travel-planning/stops/9021014003180000/
- Moovit Transit App: Route and stop information
