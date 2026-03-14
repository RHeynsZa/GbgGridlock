# HOTFIX: Remove hardcoded data and integrate API endpoints (RUA-19)

## 🚨 Critical Production Fix

This PR addresses the production outage caused by a JavaScript initialization error and completes the integration of API endpoints across the dashboard.

## Problem Solved

### Production Issue
- **Error**: `Cannot access 'M' before initialization`
- **Root Cause**: Function `mapTransportModeToLineMode` was called before its definition due to Temporal Dead Zone (TDZ) issue
- **Impact**: Dashboard completely broken in production

### Original Issue (RUA-19)
- Remove all hardcoded data in frontend
- Replace with API endpoint integrations
- Ensure all cards display real data

## Changes Made

### 🔧 Critical Bug Fix
- Moved `mapTransportModeToLineMode` function definition before its usage
- Prevents initialization errors that break the entire dashboard
- Fixed function ordering to respect JavaScript hoisting rules

### 🆕 Backend API Endpoints (3 new endpoints)
- `GET /api/v1/stats/network` - Network statistics (avg delay, reliability, cancellation rate, P95)
- `GET /api/v1/stats/hourly-trend` - Time-series data by transport mode
- `GET /api/v1/lines/details` - Comprehensive per-line metrics

### 🎨 Frontend Integration
- Removed hardcoded empty arrays: `corridorMetrics`, `delayTrend`, `lineDrilldown`
- Connected all KPI cards to real-time API data
- Wired up hourly trend chart to API endpoint
- Integrated line drilldown with API data

### ✅ Testing
**Backend Tests**: 10/10 passing
- All existing endpoints tested
- 3 new endpoint tests added

**Frontend E2E Tests**: 6/6 passing
- ✅ **NEW**: JavaScript error detection (catches initialization errors)
- ✅ **NEW**: Page error monitoring
- ✅ API endpoint request verification
- ✅ Dashboard structure rendering
- ✅ Chart rendering verification
- ✅ Critical sections visibility

## Files Changed

### Backend
- `backend/src/gbg_gridlock_api/schemas.py` - Added 3 new schemas
- `backend/src/gbg_gridlock_api/main.py` - Added 3 new endpoints
- `backend/tests/test_api.py` - Added 3 new tests

### Frontend
- `frontend/src/lib/api.ts` - Added 3 new API fetch functions
- `frontend/src/features/dashboard/dashboard-page.tsx` - **CRITICAL FIX** + API integration
- `frontend/tests/api-integration.spec.ts` - Enhanced e2e tests with error detection

## Testing Instructions

### Backend
```bash
cd backend
python3 -m pytest tests/test_api.py -v
```

### Frontend Build
```bash
cd frontend
npm run build
```

### E2E Tests
```bash
cd frontend
npx playwright test
```

## Test Results

### Backend Tests
```
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.0.2, pluggy-1.6.0
collected 10 items

tests/test_api.py::test_worst_lines_endpoint_uses_query_params_and_returns_rows PASSED
tests/test_api.py::test_bottlenecks_endpoint_returns_schema_payload PASSED
tests/test_api.py::test_line_metadata_endpoint_returns_cached_colors PASSED
tests/test_api.py::test_delay_breakdown_by_stop_uses_stop_filter_when_provided PASSED
tests/test_api.py::test_monitored_stops_endpoint_returns_human_readable_stop_names PASSED
tests/test_api.py::test_cors_preflight_allows_github_pages_origin PASSED
tests/test_api.py::test_debug_metrics_endpoint_returns_live_snapshot PASSED
tests/test_api.py::test_network_stats_endpoint_returns_aggregated_metrics PASSED
tests/test_api.py::test_hourly_trend_endpoint_returns_time_series_by_mode PASSED
tests/test_api.py::test_line_details_endpoint_returns_comprehensive_metrics_per_line PASSED

============================== 10 passed in 0.28s ==============================
```

### Frontend E2E Tests
```
Running 6 tests using 2 workers

✓ page loads without JavaScript errors or initialization issues (2.2s)
✓ makes network requests to all required API endpoints (3.0s)
✓ dashboard page structure renders correctly without errors (968ms)
✓ all critical dashboard sections are visible (2.0s)
✓ renders dashboard shell content (218ms)
✓ verifies no hardcoded empty data arrays by checking for charts (3.0s)

6 passed (12.0s)
```

## Deployment Notes

- ✅ All tests passing
- ✅ Build successful
- ✅ No breaking changes to existing endpoints
- ✅ Error monitoring in place to prevent future issues
- ✅ Function ordering fixed to prevent TDZ errors

## Breaking Changes

None. This is a backward-compatible enhancement with a critical bug fix.

## Related Issues

- Resolves RUA-19
- Fixes production outage caused by initialization error

## PR Branch

Branch: `cursor/RUA-19-data-source-api-integration-fd01`
Base: `main`

Create PR at: https://github.com/RHeynsZa/GbgGridlock/pull/new/cursor/RUA-19-data-source-api-integration-fd01
