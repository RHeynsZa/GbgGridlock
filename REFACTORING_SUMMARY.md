# Stop GID Refactoring Summary

## What Changed

Refactored the system from **hardcoded stop GIDs** to **dynamic API-based resolution**.

### Before
```python
# monitored_stops.py
MONITORED_STOPS = (
    MonitoredStopConfig(stop_gid="9021014001760000", stop_name="Centralstationen"),  # ❌ Wrong GID!
    MonitoredStopConfig(stop_gid="9021014005650000", stop_name="Redbergsplatsen"),
    # ... more hardcoded GIDs
)
```

### After
```python
# monitored_stops.py
MONITORED_STOP_NAMES = (
    "Centralstationen",
    "Redbergsplatsen",
    "Korsvägen",
    # ... just names
)
```

## How It Works Now

1. **Startup**: System queries Västtrafik API `/locations/by-text` for each stop name
2. **Storage**: Resolved GIDs stored in `monitored_stops` database table
3. **Runtime**: Worker fetches stops from database before each poll cycle
4. **Verification**: GIDs are re-resolved on each application startup

## Architecture

```
┌─────────────────────┐
│ monitored_stops.py  │  ← Just stop names
│  (Configuration)    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  stop_resolver.py   │  ← Queries Västtrafik API
│  (API Integration)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ monitored_stops DB  │  ← Stores resolved GIDs
│     (Storage)       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│     worker.py       │  ← Polls using DB stops
│  (Polling Engine)   │
└─────────────────────┘
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Maintenance** | Manual GID updates in code | Automatic resolution |
| **Correctness** | 5/6 GIDs were wrong | Always correct |
| **Resilience** | Breaks if Västtrafik changes GIDs | Self-healing |
| **Audit** | No tracking | `last_verified_at` timestamp |
| **Code** | 890+ lines of verification scripts | Clean, minimal |

## Database Schema

```sql
CREATE TABLE monitored_stops (
  stop_name VARCHAR PRIMARY KEY,
  stop_gid VARCHAR NOT NULL,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## API Changes

**None!** The public API remains unchanged. The `/api/v1/stops/monitored` endpoint still returns the same format:

```json
[
  {"stop_gid": "9021014001950000", "stop_name": "Centralstationen"},
  {"stop_gid": "9021014003980000", "stop_name": "Korsvägen"},
  ...
]
```

## Migration Path

1. **Deploy**: Run Alembic migration to create `monitored_stops` table
2. **Startup**: Worker resolves and stores GIDs automatically
3. **Verify**: Check logs for successful resolution
4. **Monitor**: Existing data in `departure_delay_events` continues to work

## Files Changed

### Added
- `backend/alembic/versions/20260323_01_create_monitored_stops_table.py`
- `backend/src/gbg_gridlock_api/stop_resolver.py`

### Modified
- `backend/src/gbg_gridlock_api/monitored_stops.py` (simplified)
- `backend/src/gbg_gridlock_api/main.py` (added startup resolution)
- `backend/src/gbg_gridlock_api/worker.py` (reads from DB)
- `backend/tests/test_api.py` (mocks DB calls)
- `backend/tests/test_worker.py` (mocks DB calls)

### Removed
- All verification scripts (no longer needed)
- Documentation about hardcoded GIDs

## Testing

All 77 tests pass ✅

Tests now mock the database calls to `get_monitored_stops()` instead of relying on hardcoded constants.

## Future Enhancements

1. **Admin API**: Add endpoint to manually trigger GID re-resolution
2. **Periodic Verification**: Re-resolve GIDs weekly to catch changes
3. **Dynamic Management**: Add/remove stops via API instead of code changes
4. **Fallback**: Cache last known good GIDs in case API is unavailable
5. **Monitoring**: Alert if resolution fails or returns unexpected results
