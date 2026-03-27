# Frontend Features - Quick Reference

**Full Analysis:** See `FRONTEND_FEATURES_ANALYSIS.md` for complete details.

---

## Top 5 Quick Wins (1-2 Weeks) 🟢

### 1. Bottleneck Stop Heatmap
**Endpoint:** `/api/v1/stops/bottlenecks` (exists, unused!)  
**UI:** Card showing top stops with highest severe delays + cancellations  
**Impact:** Reveals physical chokepoints, not just line issues

### 2. Real-Time Data Quality Indicator
**Data:** `realtime_missing` flag (tracked, never shown)  
**UI:** Badge on lines: "🟢 Live" vs "🟡 GPS Issues"  
**Impact:** Transparency builds user trust

### 3. Ferry Mode in Filter
**Data:** Already collected and in charts  
**UI:** Add 4th button to mode filter (Ship icon exists)  
**Impact:** Feature parity with backend

### 4. Comparative Time Ranges
**Data:** Duplicate queries with offset windows  
**UI:** "Compare to previous period" with delta arrows on KPIs  
**Impact:** Shows if delays are improving/worsening

### 5. Clickable Ranking → Drilldown
**Data:** Frontend state only  
**UI:** Click ranking row to auto-select + scroll to drilldown  
**Impact:** Better UX, zero backend cost

---

## High-Value Medium-Term Features (3-8 Weeks) 🟡

### 6. Peak Hour Analysis Dashboard
New route showing rush hour vs. off-peak performance by line

### 7. Line Performance Scorecard
Dedicated page per line: `/line/{number}` with 30-day history, time-of-day heatmap

### 8. "My Commute" Personalization
Save favorite lines, see personalized KPIs, get alerts

### 9. Delay Prediction & Alerts
Predict worsening delays based on 30-min trends, show alerts

### 10. Stop Cascade Visualization
Network graph showing how delays propagate between stops

---

## Advanced Features (3-12 Months) 🔵

11. Interactive Route Map (geographical visualization)
12. Historical Comparison (year-over-year, seasonal patterns)
13. Crowdsourcing (user reports beyond delays)
14. Journey Planner Integration (show alternatives when delayed)
15. Public API & Data Export (CSV downloads, API keys)
16. Accessibility Features (screen reader, simplified view)
17. Mobile PWA (offline mode, push notifications)
18. Weather/Event Correlation (external data integration)

---

## Unused Data Goldmine 💎

| Data | Status | Opportunity |
|------|--------|-------------|
| `realtime_missing` | ❌ Never shown | Data quality transparency |
| `/api/v1/stops/bottlenecks` | ❌ Endpoint unused | Stop-level insights |
| `journey_gid` | ❌ Collected, not used | Trip tracking, cascade analysis |
| `planned_time` | ❌ Collected, not used | Schedule adherence, peak analysis |
| Ferry mode | ⚠️ In data, not in filter | Complete mode coverage |

---

## Critical Gaps

- ❌ No historical comparison (today vs yesterday)
- ❌ No stop-level insights (despite having data!)
- ❌ No data quality visibility (GPS failures hidden)
- ❌ No peak hour analysis (rush hour vs off-peak)
- ❌ No personalization (can't save favorites)
- ❌ No predictive features (reactive only)

---

## Implementation Priority

**Phase 1 (Now):** Features 1-5 (quick wins)  
**Phase 2 (Next):** Features 6-8 (core enhancements)  
**Phase 3 (Later):** Features 9-10 (power features)  
**Phase 4 (Future):** Features 11-18 (advanced/ecosystem)

---

## Key Metrics

**Current Data Utilization:** 78% (7/9 endpoints used)  
**Target:** 100%

**Current Routes:** 2 (`/`, `/button-demo`)  
**Recommended:** 7+ (add `/peak-analysis`, `/line/:id`, `/map`, `/my-commute`, `/trends`, `/api-docs`)

**Unused Database Fields:** 4 (`journey_gid`, `planned_time`, `estimated_time`, `realtime_missing`)

---

## Quick Start

1. **Read full analysis:** `FRONTEND_FEATURES_ANALYSIS.md`
2. **Pick Phase 1 feature:** Start with #1 (Bottleneck Heatmap) - easiest win
3. **Create ticket:** Break down into implementation tasks
4. **Prototype:** Build quick proof-of-concept
5. **Iterate:** Get user feedback, adjust priorities

---

**Questions?** See full analysis for technical details, API specs, UI mockups, and risk mitigation.
