# Implementation Notes: RUA-44 - Apply Mode Filter to Delay Ranking

## Problem
The transport mode filter (All, Tram, Bus) in the control panel only applied to the Line Drilldown section, not to the Delay Ranking card at the top of the page. This created an inconsistent user experience where changing the filter would update some sections but not others.

## Solution
Updated the `lineDelayRanking` useMemo hook to apply the same filtering logic used by `filteredLines`.

### Code Changes

#### Before (lines 213-225)
```typescript
const lineDelayRanking = useMemo(() => {
  if (worstLinesQuery.data && worstLinesQuery.data.length > 0) {
    return [...worstLinesQuery.data]
      .map((line) => ({
        line: line.line_number,
        mode: mapTransportModeToLineMode(line.transport_mode),
        avgDelaySeconds: Math.round(line.avg_delay_seconds),
      }))
      .sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds)
  }

  return [...lineDrilldown].sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds)
}, [worstLinesQuery.data])
```

**Issues:**
- No filtering by `selectedMode`
- Missing `lineDrilldown` and `selectedMode` in dependency array
- Inconsistent with `filteredLines` behavior

#### After (lines 213-230)
```typescript
const lineDelayRanking = useMemo(() => {
  let ranking = []
  
  if (worstLinesQuery.data && worstLinesQuery.data.length > 0) {
    ranking = [...worstLinesQuery.data]
      .map((line) => ({
        line: line.line_number,
        mode: mapTransportModeToLineMode(line.transport_mode),
        avgDelaySeconds: Math.round(line.avg_delay_seconds),
      }))
  } else {
    ranking = [...lineDrilldown]
  }
  
  return ranking
    .filter((line) => (selectedMode === 'All' ? true : line.mode === selectedMode))
    .sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds)
}, [worstLinesQuery.data, lineDrilldown, selectedMode])
```

**Improvements:**
- ✅ Filters by `selectedMode` (same logic as `filteredLines`)
- ✅ Complete dependency array includes all used reactive values
- ✅ Consistent filtering behavior across all sections
- ✅ Maintains sort order by delay descending

## Testing

### Manual Testing Scenario
1. Load the dashboard with the "All" filter selected
2. Observe all lines in the Delay Ranking card
3. Click the "Tram" filter button
4. Verify only tram lines appear in both:
   - Delay Ranking card (at the top)
   - Line Drilldown section (at the bottom)
5. Click the "Bus" filter button
6. Verify only bus lines appear in both sections
7. Click "All" to reset

### Automated Testing
Added E2E test in `tests/api-integration.spec.ts`:
- Verifies delay ranking card responds to filter changes
- Checks that row count changes when switching modes
- Ensures filtered results are a subset of "All" results

## User Impact
Users now have a consistent filtering experience. When they select a transport mode:
- ✅ Delay Ranking card updates to show only matching lines
- ✅ Line Drilldown section updates to show only matching lines
- ✅ All visualizations respect the same filter

This makes the dashboard more intuitive and reduces confusion about which filter applies to which section.

## Related Files
- `frontend/src/features/dashboard/dashboard-page.tsx` - Main implementation
- `frontend/tests/api-integration.spec.ts` - E2E test coverage
- `.changeset/apply-mode-filter-to-ranking.md` - Change documentation

## Commits
1. `c60faf5` - Apply transport mode filter to delay ranking card
2. `934c2f2` - Add E2E test for transport mode filter on delay ranking
3. `17d5f52` - Add changeset for mode filter fix
