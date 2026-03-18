# Transport Mode Determination - Findings and Recommendations

## Investigation Summary

**Date:** 2026-03-18  
**Issue:** RUA-25 - Determine how to correctly identify transport type (tram, bus, ferry, etc.)

## Key Findings

### ✅ The Västtrafik API DOES provide transport mode information

The Planera Resa v4 API (`/pr/v4/stop-areas/{gid}/departures`) returns transport mode data in the response:

```json
{
  "results": [
    {
      "serviceJourney": {
        "line": {
          "transportMode": "tram",           // ← Primary field
          "transportSubMode": "none"         // ← Additional detail
        }
      }
    }
  ]
}
```

**Available fields:**
- `serviceJourney.line.transportMode` - Primary transport mode (e.g., "tram", "bus", "ferry")
- `serviceJourney.line.transportSubMode` - Sub-mode classification (e.g., "none", or more specific types)

**Observed transport modes:**
- `tram` - Tram/streetcar lines (lines 1-13, X)
- `bus` - Bus lines (most numbered routes above 13)
- `ferry` / `boat` - Ferry lines (285, 286, etc.)

### ⚠️ Current Implementation Issues

#### Issue 1: API-level filtering (MAIN PROBLEM)

**Location:** `backend/src/gbg_gridlock_api/vasttrafik_client.py:65`

```python
params={"timeSpan": str(time_span), "transportModes": "tram,bus"}
```

**Problem:** The code hardcodes `transportModes: "tram,bus"` in the API request parameters, which:
- Excludes ferry/boat departures from the response entirely
- Means the filtering happens at the API level, not in our code
- Makes it impossible to collect data for lines 285, 286 (ferries)

**Why this is "broken":** Even though the code has `ALLOWED_TRANSPORT_MODES = {"tram", "bus", "ferry", "boat"}` in `worker.py`, the ferries are filtered out before the data even reaches our code.

#### Issue 2: The fallback heuristic is good but unnecessary

**Location:** `backend/src/gbg_gridlock_api/worker.py:24-38`

The `_infer_transport_mode_from_line_number()` function provides a fallback heuristic:
- Lines 1-13 → tram
- Lines 2XX → ferry
- Others → bus

**Status:** This is a good safety net, but based on our API testing, the API always provides the `transportMode` field, so this fallback is rarely (if ever) used.

### ✅ Current Implementation Strengths

The `_transport_mode()` function in `worker.py` is well-designed:

```python
def _transport_mode(dep: dict, line_number: str = "") -> str:
    line_obj = dep.get("serviceJourney", {}).get("line") or dep.get("line") or {}
    transport_mode = line_obj.get("transportMode") or dep.get("transportMode")
    
    if transport_mode:
        return str(transport_mode).lower()
    
    if line_number:
        return _infer_transport_mode_from_line_number(line_number)
    
    return ""
```

This correctly:
1. Checks `serviceJourney.line.transportMode` (primary location)
2. Falls back to `line.transportMode` (alternative structure)
3. Falls back to `dep.transportMode` (top-level)
4. Uses heuristic as last resort
5. Normalizes to lowercase

## Recommendations

### 1. Remove API-level transport mode filter (HIGH PRIORITY)

**Change:** In `vasttrafik_client.py`, remove the `transportModes` parameter:

```python
# BEFORE (current - broken):
params={"timeSpan": str(time_span), "transportModes": "tram,bus"}

# AFTER (correct):
params={"timeSpan": str(time_span)}
```

**Rationale:** 
- Let the API return all transport modes
- Filter in our code based on `ALLOWED_TRANSPORT_MODES`
- This will enable ferry data collection

### 2. Consider adding `transportSubMode` support (OPTIONAL)

The API provides `transportSubMode` which could offer more granular classification. Consider:
- Storing `transportSubMode` in the database (already has column)
- Using it for more detailed analytics
- Displaying it in the frontend

### 3. Keep the fallback heuristic (RECOMMENDED)

Even though the API provides the data, keep `_infer_transport_mode_from_line_number()` as a safety net for:
- API changes
- Malformed responses
- Historical data migration

### 4. Update allowed transport modes if needed (VERIFY)

Current: `ALLOWED_TRANSPORT_MODES = {"tram", "bus", "ferry", "boat"}`

Verify if there are other modes in the Gothenburg network:
- Train/commuter rail?
- Metro?
- Other modes?

## Testing Evidence

Full API response samples saved to:
- `/workspace/api_response_sample.json` - Sample departures from Centralstationen

Test scripts created:
- `/workspace/investigate_transport_mode.py` - API structure investigation
- `/workspace/test_ferry_stops.py` - Filter comparison test

## Conclusion

**The current implementation is 95% correct.** The parsing logic is solid, and the API provides good data. The only issue is the hardcoded `transportModes` filter that excludes ferries.

**Simple fix:** Remove one parameter from the API call in `vasttrafik_client.py`.

## References

- Västtrafik Developer Portal: https://developer.vasttrafik.se/apis/13/v4
- API Documentation: https://github.com/vasttrafik/api-pr-docs
- API Endpoint: `GET https://ext-api.vasttrafik.se/pr/v4/stop-areas/{gid}/departures`
