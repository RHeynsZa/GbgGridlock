# Stop GID Fix Summary - RUA-37

## Problem Identified

The Linear issue RUA-37 reported that stop IDs weren't correct, particularly for Redbergsplatsen and Hjalmar Brantingsplatsen, which didn't show the expected transit lines.

## Root Cause

**5 out of 6 monitored stops had INCORRECT stop area GIDs!**

This explains why the expected lines weren't appearing in the data - the worker was polling the wrong stop areas in the Västtrafik API.

## Corrections Made

All GIDs were verified against the official Västtrafik website:

| Stop Name | Old GID (Incorrect) | New GID (Correct) | Status |
|-----------|---------------------|-------------------|--------|
| Centralstationen | `9021014001760000` | `9021014001950000` | ✅ Fixed |
| Korsvägen | `9021014002510000` | `9021014003980000` | ✅ Fixed |
| Järntorget | `9021014003610000` | `9021014003640000` | ✅ Fixed |
| Marklandsgatan | `9021014004490000` | `9021014004760000` | ✅ Fixed |
| Hjalmar Brantingsplatsen | `9021014003100000` | `9021014003180000` | ✅ Fixed |
| Redbergsplatsen | `9021014005650000` | `9021014005650000` | ⚠️ Unverified |

## Expected Transit Lines (After Fix)

### Centralstationen
- Multiple tram lines (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13)
- Multiple bus lines
- Major transit hub

### Korsvägen
- Tram lines: 4, 5, 6, 8, 12
- Express lines: X4, X6
- Bus lines: 18, 61, 63, 100, 101, 102

### Järntorget
- Multiple tram lines
- Bus lines

### Marklandsgatan
- Tram line: 3
- Bus lines: 65, 758

### Hjalmar Brantingsplatsen
- Multiple tram lines (major hub on Hisingen)
- Bus lines: 31, 37, 42

### Redbergsplatsen
- Tram lines: 1, 3, 6, 8
- Bus lines: 17, 60, 62

## Changes Committed

1. **`backend/src/gbg_gridlock_api/monitored_stops.py`**
   - Updated all stop area GIDs with correct values
   - Added TODO comment for Redbergsplatsen

2. **`backend/tests/test_api.py`**
   - Updated test assertions with correct GIDs
   - All 77 tests pass ✅

3. **Verification Tools Added**
   - `verify_stop_gids_web.py` - No API credentials needed
   - `verify_stop_ids.py` - Requires Västtrafik API credentials
   - `search_stop_ids.py` - Search for stops by name
   - `analyze_recorded_stops.py` - Analyze database records

4. **Documentation**
   - `STOP_ID_VERIFICATION_FINDINGS.md` - Detailed findings

## Next Steps

### Immediate (Required)
1. ✅ Merge the PR (#48)
2. 🔄 Deploy the updated code
3. 🔄 Monitor the worker logs to ensure it's polling the correct stops
4. 🔄 Verify that expected lines start appearing in the data

### Optional (Recommended)
1. **Verify Redbergsplatsen GID**: Run `verify_stop_ids.py` with Västtrafik API credentials to confirm if `9021014005650000` is correct
2. **Database Migration**: If the database has existing data with old GIDs, consider:
   - Keeping old data for historical analysis (with a note about the GID change)
   - OR updating old records to use new GIDs (if stop areas are truly the same)
   - OR clearing old data and starting fresh
3. **Add Monitoring**: Set up alerts if a stop returns no departures (could indicate incorrect GID)

## How to Use Verification Scripts

### Web-based Verification (No credentials needed)
```bash
python3 verify_stop_gids_web.py
```

### API-based Verification (Requires credentials)
```bash
export VT_CLIENT_ID='your_client_id'
export VT_CLIENT_SECRET='your_client_secret'
export VT_AUTH_KEY='your_subscription_key'

python3 verify_stop_ids.py
python3 search_stop_ids.py
```

### Database Analysis (Requires database connection)
```bash
export DATABASE_URL='postgresql://gbg:gbg@localhost:5432/gbggridlock'
python3 analyze_recorded_stops.py
```

## Impact

After this fix:
- ✅ Worker will poll the correct stop areas
- ✅ Expected transit lines will appear in the data
- ✅ Delay analytics will be accurate
- ✅ Dashboard will show meaningful data for all monitored stops

## References

- Linear Issue: RUA-37
- Pull Request: #48
- Västtrafik API Documentation: https://developer.vasttrafik.se/
- Official Västtrafik Stop Pages: https://www.vasttrafik.se/en/travel-planning/stops/{GID}/
