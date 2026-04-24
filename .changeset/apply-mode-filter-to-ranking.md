---
"gbg-gridlock-frontend": patch
---

Apply transport mode filter to delay ranking card

The All/Tram/Bus transport mode filter in the control panel now correctly applies to both the Delay Ranking card and the Line Drilldown section. Previously, the filter only affected the Line Drilldown section.

**Technical Changes:**
- Updated `lineDelayRanking` useMemo hook to filter by `selectedMode`
- Added `selectedMode` to the dependency array for proper reactivity
- Added E2E test to verify the filter behavior

**User Impact:**
When users select a transport mode filter (All, Tram, or Bus), the delay ranking card will now show only lines matching that mode, providing a more consistent and intuitive filtering experience across all dashboard sections.
