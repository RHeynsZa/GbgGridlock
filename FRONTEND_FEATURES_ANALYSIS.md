# GbgGridlock Frontend Features Analysis & Recommendations

**Analysis Date:** March 27, 2026  
**Analyst Role:** Data Analyst  
**Project:** GbgGridlock - Västtrafik Transit Analytics Dashboard

---

## Executive Summary

This document provides a comprehensive analysis of the GbgGridlock frontend application and available backend data, followed by actionable feature recommendations. The analysis reveals significant untapped data potential and user experience opportunities that could transform GbgGridlock from a basic delay dashboard into a comprehensive transit intelligence platform.

---

## Current State Analysis

### 1. Frontend Architecture

**Tech Stack:**
- React 18 + TypeScript + Vite
- TanStack Router (file-based routing)
- TanStack Query v5 (data fetching)
- Recharts (visualizations)
- Tailwind CSS v4 + shadcn/ui components
- i18next (internationalization: English/Swedish)
- Luxon (timezone handling)

**Current Routes:**
- `/` - Main dashboard (single page)
- `/button-demo` - Component showcase (dev page)

**Current UI Components:**
- Card family (shadcn-style)
- AccentedButton (custom with accent stripe)
- Minimal component library (not full shadcn install)

### 2. Current Dashboard Features

The existing dashboard is a **single-page scrolling layout** with these sections:

1. **Network Overview KPIs** (4 cards)
   - Average delay (seconds)
   - P95 delay (95th percentile)
   - Reliability percentage (≤5min delay)
   - Cancellation rate

2. **Filters Sidebar**
   - Time range selector (1h, 6h, 24h, 7d, 30d)
   - Monitored stop dropdown (6 stops)
   - Transport mode filter (All, Tram, Bus) - *Ferry exists in data but not UI*

3. **Hourly Trend Chart** (Recharts AreaChart)
   - 3 series: Tram, Bus, Ferry
   - UTC → Europe/Stockholm timezone conversion
   - Configurable window (1-168 hours)

4. **Line Delay Ranking** (Custom horizontal bars)
   - Top 10 worst lines by avg delay
   - Colored by line metadata from API
   - Shows mode icon + delay in seconds

5. **Route Drilldown**
   - Line selector chips (clickable)
   - Selected line stats: avg delay, on-time %, cancellations
   - Styled with line colors

6. **Delay Distribution Histogram** (Recharts BarChart)
   - Bucketed by 60-second intervals
   - Shows right-skewed distribution
   - Per-line view

7. **System Diagnostics** (Read-only grid)
   - Worker health metrics (5-min rolling window)
   - API response times, success rates, poll counts

### 3. Available Backend Data (Underutilized)

#### **API Endpoints Currently Used:**
- ✅ `/api/v1/delays/by-stop` - Worst lines (with optional stop filter)
- ✅ `/api/v1/stops/monitored` - List of monitored stops
- ✅ `/api/v1/lines/metadata` - Line colors and transport modes
- ✅ `/api/v1/debug/metrics` - Worker diagnostics
- ✅ `/api/v1/stats/network` - Network-wide KPIs
- ✅ `/api/v1/stats/hourly-trend` - Time-series by mode
- ✅ `/api/v1/lines/details` - Per-line statistics
- ✅ `/api/v1/delays/distribution/{line}` - Delay histogram

#### **API Endpoints NOT Used:**
- ❌ `/api/v1/delays/worst-lines` - Similar to by-stop but simpler
- ❌ `/api/v1/stops/bottlenecks` - **High-value unused data!**

#### **Database Fields Collected But Not Exposed:**
- `journey_gid` - Unique trip identifier (could enable trip tracking)
- `planned_time` - Scheduled departure time (could show schedule adherence)
- `estimated_time` - Real-time prediction (could show prediction accuracy)
- `realtime_missing` - GPS connection loss flag (**critical reliability indicator**)
- `stop_gid` - Stop identifiers (used internally but not user-facing)

### 4. Data Characteristics & Opportunities

**Time-Series Data:**
- TimescaleDB hypertable with `recorded_at` partitioning
- Indexed on `(line_number, recorded_at)` and `(stop_gid, recorded_at)`
- Supports efficient time-window queries (5 min to 7 days)
- **Opportunity:** Historical trend analysis, pattern detection

**Spatial Data:**
- 6 monitored "chokepoint" stops (high-traffic hubs)
- Stop names: Centralstationen, Redbergsplatsen, Korsvägen, Järntorget, Marklandsgatan, Hjalmar Brantingsplatsen
- **Opportunity:** Network topology visualization, cascade analysis

**Real-Time Reliability:**
- `realtime_missing` flag indicates GPS/tracking failures
- Currently tracked but **never displayed to users**
- **Opportunity:** Data quality metrics, "ghost bus" detection

**Multi-Modal Network:**
- Tram, Bus, Ferry (boat) modes
- Ferry data collected but **not shown in mode filter UI**
- **Opportunity:** Modal comparison, intermodal transfer analysis

**Statistical Depth:**
- Right-skewed delay distributions (delays can't be negative)
- P95 already calculated (good for SLA monitoring)
- Sample sizes tracked (statistical confidence)
- **Opportunity:** Percentile trends, confidence intervals, anomaly detection

---

## Gap Analysis

### Critical Gaps

1. **No Historical Comparison**
   - Users can't compare "today vs. yesterday" or "this week vs. last week"
   - No way to identify improving/worsening trends

2. **No Stop-Level Insights**
   - Bottleneck endpoint exists but unused
   - Users can't see which stops cause the most delays
   - No visualization of delay propagation through the network

3. **No Real-Time Data Quality Visibility**
   - `realtime_missing` flag is invisible to users
   - Users don't know when data is unreliable
   - No "ghost bus" or GPS failure alerts

4. **No Predictive/Contextual Features**
   - No peak hour analysis (rush hour vs. off-peak)
   - No day-of-week patterns (weekday vs. weekend)
   - No weather/event correlation (future opportunity)

5. **Limited Interactivity**
   - Can't click a line in the ranking to auto-select it in drilldown
   - Can't filter distribution chart by time-of-day
   - No drill-down from network KPIs to underlying data

6. **No User Personalization**
   - Can't save favorite lines or stops
   - No customizable alerts or thresholds
   - No "My Commute" feature

### UX/Design Gaps

1. **Single-Page Overload**
   - All features crammed into one scrolling page
   - No dedicated views for deep analysis
   - Hard to focus on specific insights

2. **Ferry Mode Hidden**
   - Data exists but not in UI filter
   - Inconsistent with backend capabilities

3. **No Mobile Optimization Noted**
   - Responsive classes exist but no mobile-first features
   - No progressive web app (PWA) capabilities

4. **No Data Export**
   - Users can't export data for external analysis
   - No CSV/JSON download options

---

## Recommended Features (Prioritized)

### **Tier 1: High-Value, Low-Complexity** 🟢

These features leverage existing data with minimal backend changes.

#### 1.1 **Bottleneck Stop Heatmap**
**What:** Visual map/list of stops with highest severe delay + cancellation rates  
**Why:** `/api/v1/stops/bottlenecks` endpoint exists but is unused - this is free data!  
**Data Source:** `GET /api/v1/stops/bottlenecks?window_minutes=1440&limit=10`  
**UI Approach:**
- New card on dashboard showing top 5-10 bottleneck stops
- Display: Stop name, severe delay count, total departures, severity %
- Color-coded severity scale (green → yellow → red)
- Clickable to filter main dashboard by that stop

**Impact:** Helps users identify which physical locations are problematic, not just which lines.

---

#### 1.2 **Real-Time Data Quality Indicator**
**What:** Expose `realtime_missing` flag to show GPS tracking reliability  
**Why:** Critical for user trust - users need to know when data is stale/unreliable  
**Data Source:** New backend endpoint: `GET /api/v1/stats/data-quality?window_minutes=60`  
**Backend Change Required:** Aggregate `realtime_missing` by line/stop  
**UI Approach:**
- Small badge on line cards: "🟢 Live" vs "🟡 GPS Issues" vs "🔴 No Data"
- Network-level KPI: "Data Coverage: 94%" (% of departures with real-time data)
- Tooltip explaining what "GPS Issues" means

**Impact:** Transparency builds trust; users won't blame the app for Västtrafik's data gaps.

---

#### 1.3 **Ferry Mode in Transport Filter**
**What:** Add "Ferry" button to mode filter (currently only All/Tram/Bus)  
**Why:** Data is collected and displayed in charts but can't be filtered  
**Data Source:** Already available in all endpoints  
**UI Approach:**
- Add 4th `AccentedButton` for Ferry mode (Ship icon already imported)
- Update filter logic to include `mode === 'Ferry'`

**Impact:** Feature parity with backend; useful for users near Gothenburg archipelago routes.

---

#### 1.4 **Comparative Time Range Selector**
**What:** Add "Compare to previous period" toggle  
**Why:** Users want to know if delays are getting better or worse  
**Data Source:** Duplicate existing queries with offset time windows  
**UI Approach:**
- Checkbox: "Compare to previous [period]"
- Show delta arrows (↑↓) on KPI cards: "Avg Delay: 45s (↓12% vs last week)"
- Dual-line charts showing current vs. previous period

**Impact:** Adds temporal context without new data collection.

---

#### 1.5 **Clickable Line Ranking → Auto-Select in Drilldown**
**What:** Clicking a line in the ranking auto-scrolls and selects it in the drilldown section  
**Why:** Improves navigation flow; reduces user effort  
**Data Source:** Frontend state management only  
**UI Approach:**
- Add `onClick` handler to ranking rows
- Use `setSelectedLine()` + smooth scroll to drilldown section
- Highlight selected line in ranking with accent border

**Impact:** Better UX with zero backend cost.

---

### **Tier 2: High-Value, Moderate-Complexity** 🟡

These features require new backend endpoints or significant frontend work.

#### 2.1 **Peak Hour Analysis Dashboard**
**What:** Dedicated view showing rush hour (7-9am, 4-7pm) vs. off-peak performance  
**Why:** Delays have different causes/severity during peak hours; users care about commute times  
**Data Source:** New endpoint: `GET /api/v1/stats/peak-analysis?window_days=7`  
**Backend Logic:**
```sql
SELECT 
  CASE 
    WHEN EXTRACT(HOUR FROM recorded_at) BETWEEN 7 AND 9 THEN 'morning_peak'
    WHEN EXTRACT(HOUR FROM recorded_at) BETWEEN 16 AND 19 THEN 'evening_peak'
    ELSE 'off_peak'
  END AS period,
  line_number,
  AVG(delay_seconds) AS avg_delay,
  COUNT(*) AS sample_size
FROM departure_delay_events
WHERE recorded_at >= NOW() - INTERVAL '7 days'
GROUP BY period, line_number
```
**UI Approach:**
- New route: `/peak-analysis`
- 3-column comparison: Morning Peak | Off-Peak | Evening Peak
- Heatmap showing which lines suffer most during each period
- Filter by day-of-week (weekday vs. weekend)

**Impact:** Actionable insights for commuters and transit planners.

---

#### 2.2 **Line Performance Scorecard**
**What:** Dedicated page per line with comprehensive stats and history  
**Why:** Power users want deep dive into specific lines they use daily  
**Data Source:** 
- Existing: `/api/v1/lines/details`, `/api/v1/delays/distribution/{line}`
- New: `/api/v1/lines/{line}/history?window_days=30` (daily aggregates)
**UI Approach:**
- New route: `/line/{lineNumber}`
- Sections:
  - **Overview:** Current stats (avg delay, on-time %, cancellations)
  - **30-Day Trend:** Line chart of daily avg delay
  - **Delay Distribution:** Existing histogram
  - **Worst Stops:** Which stops on this line have highest delays
  - **Time-of-Day Heatmap:** Hour × Day grid showing delay patterns
  - **Reliability Score:** Letter grade (A-F) based on on-time %

**Impact:** Deep insights for frequent riders; shareable link for complaints to Västtrafik.

---

#### 2.3 **Stop Cascade Visualization**
**What:** Network graph showing how delays propagate between monitored stops  
**Why:** Delays cascade through the network; visualizing this helps identify root causes  
**Data Source:** New endpoint: `GET /api/v1/stops/cascade-analysis?window_minutes=60`  
**Backend Logic:**
- Track `journey_gid` across stops to see same vehicle's delay progression
- Calculate correlation between stop delays (if Stop A is delayed, Stop B is delayed X minutes later)
**UI Approach:**
- Interactive node graph (use D3.js or Cytoscape.js)
- Nodes = monitored stops, edges = common routes, edge thickness = delay correlation
- Animate delay "waves" propagating through network
- Click node to see lines passing through that stop

**Impact:** Reveals systemic issues vs. isolated incidents; high visual impact.

---

#### 2.4 **"My Commute" Personalization**
**What:** Let users save their frequent lines/stops and see personalized dashboard  
**Why:** Most users care about 1-3 specific routes, not the entire network  
**Data Source:** 
- Frontend: localStorage for saved preferences
- Backend: Existing endpoints filtered to user's lines/stops
**UI Approach:**
- New route: `/my-commute`
- Setup wizard: "Which lines do you use?" (multi-select)
- Personalized KPIs: "Your average delay today: 32s"
- Alerts: "⚠️ Line 6 is delayed 8 minutes right now"
- Compare: "Your commute is 15% more reliable than network average"

**Impact:** High engagement; transforms app from informational to personal tool.

---

#### 2.5 **Delay Prediction & Alerts**
**What:** Predict if a line will be delayed in next 30-60 minutes based on current trends  
**Why:** Proactive > reactive; helps users plan alternative routes  
**Data Source:** 
- Current: Real-time delay trends from last 15-30 minutes
- Future: Simple ML model (linear regression on recent trend)
**Backend Logic:**
- If line's avg delay increased >50% in last 30 min → "Worsening" alert
- If multiple lines on same corridor delayed → "Network issue" alert
**UI Approach:**
- Alert banner at top of dashboard: "⚠️ Line 11 delays worsening (now 6min, was 3min)"
- Prediction badge on line cards: "🔮 Likely delayed in next hour"
- Optional: Browser notifications (requires PWA setup)

**Impact:** Actionable intelligence; differentiates from static dashboards.

---

### **Tier 3: Advanced Features (Future Roadmap)** 🔵

These require significant engineering effort or external data integration.

#### 3.1 **Interactive Route Map**
**What:** Geographical map of Gothenburg showing monitored stops, lines, and real-time delays  
**Why:** Spatial context is intuitive; users can see their neighborhood  
**Requirements:**
- Map library (Mapbox GL JS or Leaflet)
- GTFS static data for route geometries (if available from Västtrafik)
- Geocoding for monitored stops
**UI Approach:**
- New route: `/map`
- Color-coded lines by delay severity
- Clickable stops show real-time departures
- Heatmap overlay for delay intensity

**Impact:** High visual appeal; useful for tourists/new residents.

---

#### 3.2 **Historical Comparison & Benchmarking**
**What:** Compare current performance to historical baselines (last month, last year)  
**Why:** Identify long-term trends, seasonal patterns, infrastructure impact  
**Requirements:**
- Retain data for 12+ months (TimescaleDB compression)
- Pre-aggregate monthly/yearly stats (materialized views)
**UI Approach:**
- New route: `/trends`
- Year-over-year comparison: "March 2026 vs March 2025"
- Seasonal patterns: "Summer is 20% more reliable than winter"
- Event annotations: "Delays spiked during track maintenance (Feb 10-15)"

**Impact:** Strategic insights for transit advocacy and planning.

---

#### 3.3 **Crowdsourcing & User Reports**
**What:** Let users report issues (crowding, vehicle condition, safety) beyond delay data  
**Why:** Västtrafik API only tracks delays; user experience includes other factors  
**Requirements:**
- New backend service for user-generated content
- Moderation system
- Authentication (optional: anonymous with rate limiting)
**UI Approach:**
- "Report Issue" button on line cards
- Form: Line, Stop, Issue type (crowded, dirty, unsafe, other), optional photo
- Display aggregated reports: "Line 6: 12 crowding reports today"

**Impact:** Community engagement; richer dataset; potential partnership with Västtrafik.

---

#### 3.4 **Multi-Modal Journey Planner Integration**
**What:** Show alternative routes when primary line is delayed  
**Why:** Users need actionable alternatives, not just delay info  
**Requirements:**
- Integration with Västtrafik Planera Resa v4 journey planner API
- Real-time routing engine
**UI Approach:**
- "Find Alternative" button when line is severely delayed
- Show 2-3 fastest alternatives with ETAs
- Compare: "Your usual route (Line 6): 45 min | Alternative (Line 11 + 16): 38 min"

**Impact:** Transforms app from informational to decision-support tool.

---

#### 3.5 **API & Data Export for Power Users**
**What:** Public API and CSV export for researchers, developers, journalists  
**Why:** Open data fosters innovation; builds community goodwill  
**Requirements:**
- Rate-limited public API (or API keys)
- CSV/JSON export buttons on all charts
- Documentation site
**UI Approach:**
- New route: `/api-docs` (Swagger UI)
- "Export" button on each chart → downloads CSV
- "Share" button → generates shareable link with current filters

**Impact:** Ecosystem growth; potential for third-party apps; transparency.

---

#### 3.6 **Accessibility & Inclusivity Features**
**What:** Screen reader optimization, high-contrast mode, simplified view  
**Why:** Public transit data should be accessible to all users  
**Requirements:**
- ARIA labels on all interactive elements
- Keyboard navigation testing
- Simplified "text-only" mode for low-bandwidth/assistive tech
**UI Approach:**
- Settings toggle: "Simplified View" (removes charts, shows tables)
- High-contrast theme (WCAG AAA compliance already in design system)
- Voice navigation support (experimental)

**Impact:** Inclusive design; potential government/NGO partnerships.

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)
- ✅ Bottleneck Stop Heatmap (1.1)
- ✅ Ferry Mode in Filter (1.3)
- ✅ Clickable Ranking → Drilldown (1.5)

### Phase 2: Core Enhancements (3-4 weeks)
- ✅ Real-Time Data Quality Indicator (1.2)
- ✅ Comparative Time Range Selector (1.4)
- ✅ Peak Hour Analysis Dashboard (2.1)

### Phase 3: Power Features (6-8 weeks)
- ✅ Line Performance Scorecard (2.2)
- ✅ "My Commute" Personalization (2.4)
- ✅ Delay Prediction & Alerts (2.5)

### Phase 4: Advanced (3-6 months)
- ✅ Stop Cascade Visualization (2.3)
- ✅ Interactive Route Map (3.1)
- ✅ Historical Comparison (3.2)

### Phase 5: Ecosystem (6-12 months)
- ✅ Crowdsourcing (3.3)
- ✅ Journey Planner Integration (3.4)
- ✅ Public API & Export (3.5)
- ✅ Accessibility Features (3.6)

---

## Technical Considerations

### Frontend Architecture Changes

**Current:** Single-page dashboard  
**Recommended:** Multi-page app with nested routes

```
/                     → Dashboard (overview)
/peak-analysis        → Peak hour analysis (2.1)
/line/:lineNumber     → Line scorecard (2.2)
/map                  → Interactive map (3.1)
/my-commute           → Personalized view (2.4)
/trends               → Historical analysis (3.2)
/api-docs             → API documentation (3.5)
```

**Routing:** TanStack Router already in place; add file routes under `src/routes/`

### Backend API Additions

**New Endpoints Needed:**

```
GET /api/v1/stats/data-quality?window_minutes=60
  → Returns % of departures with real-time data, by line/stop

GET /api/v1/stats/peak-analysis?window_days=7
  → Returns delay stats grouped by time-of-day period

GET /api/v1/lines/{line}/history?window_days=30
  → Returns daily aggregates for a specific line

GET /api/v1/stops/cascade-analysis?window_minutes=60
  → Returns delay correlation matrix between stops

GET /api/v1/alerts/current
  → Returns active alerts (worsening delays, network issues)
```

**Database Optimization:**

- Consider materialized views for historical aggregates (3.2)
- Add indexes on `EXTRACT(HOUR FROM recorded_at)` for peak analysis (2.1)
- Implement TimescaleDB continuous aggregates for daily/hourly rollups

### Performance Considerations

- **Caching:** Current 5-min cache on line metadata is good; extend to other endpoints
- **Pagination:** Add pagination to bottleneck/ranking endpoints if >50 results
- **Real-Time Updates:** Consider WebSocket for live alerts (2.5) instead of polling
- **Chart Performance:** Recharts handles 100s of data points well; for 1000s, consider downsampling

### Mobile & PWA

- Current responsive design is adequate but not mobile-first
- Consider PWA manifest for:
  - Add to home screen
  - Offline mode (cache last-fetched data)
  - Push notifications for alerts (2.5)

---

## Success Metrics

### User Engagement
- **Current:** Unknown (no analytics visible in code beyond PostHog stub)
- **Target:** 
  - 50% of users interact with new features within 2 weeks of launch
  - 30% of users save "My Commute" preferences (2.4)
  - Average session duration increases by 40%

### Data Utilization
- **Current:** 7/9 backend endpoints used (78%)
- **Target:** 100% of collected data exposed in UI

### User Satisfaction
- **Current:** No feedback mechanism
- **Target:** 
  - Add in-app feedback widget
  - NPS score >40 within 3 months
  - <5% of users report "data is confusing"

### Technical Health
- **Current:** Frontend loads in <2s (assumed, no metrics in code)
- **Target:**
  - Maintain <2s initial load with new features
  - <200ms API response times for 95th percentile
  - Zero client-side errors in production

---

## Risks & Mitigations

### Risk 1: Feature Bloat
**Risk:** Adding too many features makes app overwhelming  
**Mitigation:** 
- Implement progressive disclosure (advanced features behind tabs/toggles)
- User testing at each phase
- "Simplified View" option (3.6)

### Risk 2: Backend Load
**Risk:** New endpoints increase database query load  
**Mitigation:**
- Implement aggressive caching (5-15 min TTLs)
- Use TimescaleDB continuous aggregates for historical queries
- Monitor query performance with `EXPLAIN ANALYZE`

### Risk 3: Data Quality Issues
**Risk:** Exposing `realtime_missing` flag highlights Västtrafik's data gaps  
**Mitigation:**
- Frame as transparency, not criticism
- Provide educational tooltips explaining GPS limitations
- Offer "Report Issue" feature to crowdsource validation (3.3)

### Risk 4: Maintenance Burden
**Risk:** More features = more code to maintain  
**Mitigation:**
- Strict TypeScript typing (already in place)
- Comprehensive test coverage (expand Playwright E2E tests)
- Modular component architecture (already using shadcn pattern)

---

## Conclusion

GbgGridlock has a solid technical foundation and collects rich data, but the current frontend only scratches the surface of its potential. The recommended features fall into three categories:

1. **Unlock Existing Data** (Tier 1): Expose bottlenecks, data quality, ferry mode → **Immediate value, minimal effort**
2. **Enhance User Experience** (Tier 2): Peak analysis, line scorecards, personalization → **High engagement, moderate effort**
3. **Build Ecosystem** (Tier 3): Maps, crowdsourcing, public API → **Strategic differentiation, high effort**

**Priority Recommendation:** Focus on **Tier 1** features first (1-2 weeks of work) to demonstrate quick wins, then move to **Tier 2** based on user feedback. Tier 3 features should be evaluated after 3-6 months of usage data.

The biggest opportunity is **making the invisible visible**: bottleneck stops, data quality issues, and temporal patterns are all tracked but hidden from users. Exposing these insights will transform GbgGridlock from a "delay dashboard" into a "transit intelligence platform."

---

## Appendix: Data Dictionary

### Available Database Fields

| Field | Type | Currently Used? | Potential Use Cases |
|-------|------|-----------------|---------------------|
| `recorded_at` | TIMESTAMPTZ | ✅ Yes | Time-series analysis, trend detection |
| `stop_gid` | VARCHAR | ⚠️ Internal only | Stop-level analysis, cascade visualization |
| `journey_gid` | VARCHAR | ❌ No | Trip tracking, delay propagation, vehicle reliability |
| `line_number` | VARCHAR | ✅ Yes | Line filtering, ranking, drilldown |
| `planned_time` | TIMESTAMPTZ | ❌ No | Schedule adherence, peak hour analysis |
| `estimated_time` | TIMESTAMPTZ | ❌ No | Prediction accuracy, real-time updates |
| `delay_seconds` | INTEGER | ✅ Yes | Core metric for all delay features |
| `is_cancelled` | BOOLEAN | ✅ Yes | Cancellation rate, reliability scoring |
| `realtime_missing` | BOOLEAN | ❌ No | **Data quality indicator, GPS failure detection** |
| `transport_mode` | VARCHAR | ✅ Yes | Mode filtering, modal comparison |

### API Endpoint Coverage

| Endpoint | Status | Frontend Usage |
|----------|--------|----------------|
| `/health` | ✅ Available | Not used (could add status indicator) |
| `/api/v1/delays/worst-lines` | ✅ Available | Not used (redundant with by-stop) |
| `/api/v1/delays/by-stop` | ✅ Available | ✅ Used (main ranking) |
| `/api/v1/stops/monitored` | ✅ Available | ✅ Used (stop filter dropdown) |
| `/api/v1/delays/distribution/{line}` | ✅ Available | ✅ Used (histogram chart) |
| `/api/v1/stops/bottlenecks` | ✅ Available | ❌ **NOT USED - High priority!** |
| `/api/v1/lines/metadata` | ✅ Available | ✅ Used (line colors) |
| `/api/v1/stats/network` | ✅ Available | ✅ Used (KPI cards) |
| `/api/v1/stats/hourly-trend` | ✅ Available | ✅ Used (time-series chart) |
| `/api/v1/lines/details` | ✅ Available | ✅ Used (drilldown stats) |
| `/api/v1/debug/metrics` | ✅ Available | ✅ Used (diagnostics section) |

---

**End of Analysis**
