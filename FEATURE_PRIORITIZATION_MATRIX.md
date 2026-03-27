# Feature Prioritization Matrix

**Purpose:** Visual guide for prioritizing the 18 recommended frontend features based on effort vs. impact.

---

## Effort vs. Impact Matrix

```
HIGH IMPACT
│
│  [2.1 Peak Hour]     [2.2 Line Scorecard]     [3.1 Interactive Map]
│  [2.4 My Commute]    [2.5 Predictions]        [3.2 Historical Compare]
│       
│  [1.1 Bottlenecks]   [2.3 Cascade Viz]        [3.4 Journey Planner]
│  [1.2 Data Quality]  
│  [1.4 Compare Range] 
│       
│  [1.3 Ferry Filter]  [3.3 Crowdsourcing]      [3.5 Public API]
│  [1.5 Clickable]     [3.6 Accessibility]
│
LOW IMPACT
└────────────────────────────────────────────────────────────────
   LOW EFFORT          MEDIUM EFFORT            HIGH EFFORT
```

---

## Feature Scoring Table

| # | Feature | Effort | Impact | User Value | Tech Debt | Priority Score |
|---|---------|--------|--------|------------|-----------|----------------|
| **1.1** | Bottleneck Heatmap | 🟢 Low | 🔴 High | 9/10 | None | **★★★★★** |
| **1.2** | Data Quality Indicator | 🟢 Low | 🔴 High | 8/10 | None | **★★★★★** |
| **1.4** | Comparative Ranges | 🟢 Low | 🔴 High | 9/10 | None | **★★★★★** |
| **1.3** | Ferry Filter | 🟢 Low | 🟡 Medium | 6/10 | None | **★★★★☆** |
| **1.5** | Clickable Ranking | 🟢 Low | 🟡 Medium | 7/10 | None | **★★★★☆** |
| **2.1** | Peak Hour Analysis | 🟡 Medium | 🔴 High | 9/10 | Low | **★★★★☆** |
| **2.4** | My Commute | 🟡 Medium | 🔴 High | 10/10 | Low | **★★★★☆** |
| **2.5** | Delay Predictions | 🟡 Medium | 🔴 High | 9/10 | Medium | **★★★★☆** |
| **2.2** | Line Scorecard | 🟡 Medium | 🟡 Medium | 8/10 | Low | **★★★☆☆** |
| **2.3** | Cascade Visualization | 🟡 Medium | 🟡 Medium | 7/10 | Medium | **★★★☆☆** |
| **3.1** | Interactive Map | 🔴 High | 🔴 High | 8/10 | High | **★★★☆☆** |
| **3.2** | Historical Compare | 🔴 High | 🔴 High | 8/10 | Medium | **★★★☆☆** |
| **3.4** | Journey Planner | 🔴 High | 🟡 Medium | 9/10 | High | **★★☆☆☆** |
| **3.3** | Crowdsourcing | 🔴 High | 🟡 Medium | 7/10 | High | **★★☆☆☆** |
| **3.5** | Public API | 🔴 High | 🟡 Medium | 6/10 | Medium | **★★☆☆☆** |
| **3.6** | Accessibility | 🔴 High | 🟡 Medium | 8/10 | Low | **★★☆☆☆** |

**Priority Score Formula:** `(Impact × 2 + User Value - Tech Debt) / Effort`

---

## Decision Framework

### Start Here (Do First) ✅
**Features with High Impact + Low Effort**

1. **Bottleneck Heatmap (1.1)** - Endpoint exists, just add UI card
2. **Data Quality Indicator (1.2)** - Expose existing `realtime_missing` flag
3. **Comparative Ranges (1.4)** - Duplicate queries with time offset

**Why:** Maximum ROI, quick wins, build momentum

---

### Do Next (Phase 2) 🔄
**Features with High Impact + Medium Effort**

4. **Peak Hour Analysis (2.1)** - Requires new SQL aggregation
5. **My Commute (2.4)** - localStorage + filtered queries
6. **Delay Predictions (2.5)** - Trend analysis + alerts

**Why:** High user value, manageable scope, strategic differentiation

---

### Consider Later (Phase 3+) ⏳
**Features with High Effort or Lower Impact**

7. **Interactive Map (3.1)** - Requires map library + geocoding
8. **Historical Compare (3.2)** - Needs long-term data retention
9. **Journey Planner (3.4)** - External API integration

**Why:** Complex, resource-intensive, or dependent on other features

---

### Nice-to-Have (Backlog) 📋
**Features with Lower Priority Score**

10. **Ferry Filter (1.3)** - Low effort but limited user base
11. **Clickable Ranking (1.5)** - UX polish, not critical
12. **Public API (3.5)** - Ecosystem play, not core user value

**Why:** Polish features, niche audiences, or strategic bets

---

## Scoring Criteria

### Effort (Engineering Cost)
- 🟢 **Low:** 1-2 weeks, frontend only, no new endpoints
- 🟡 **Medium:** 3-8 weeks, new backend endpoint, moderate complexity
- 🔴 **High:** 2-6 months, external integrations, significant architecture changes

### Impact (User Value × Reach)
- 🔴 **High:** Solves critical pain point for >70% of users
- 🟡 **Medium:** Useful for 30-70% of users or power users
- 🟢 **Low:** Nice-to-have for <30% of users

### User Value (1-10 Scale)
- **10:** Transformative, changes how users interact with app
- **8-9:** Highly valuable, addresses major use case
- **6-7:** Useful improvement, enhances experience
- **4-5:** Minor enhancement, limited benefit
- **1-3:** Marginal value, edge case

### Tech Debt (Maintenance Burden)
- **None:** Self-contained, no ongoing maintenance
- **Low:** Minimal dependencies, easy to maintain
- **Medium:** Some complexity, periodic updates needed
- **High:** Complex integrations, significant ongoing work

---

## Recommended Sprint Planning

### Sprint 1-2 (Weeks 1-4): Quick Wins
- ✅ Bottleneck Heatmap (1.1)
- ✅ Data Quality Indicator (1.2)
- ✅ Ferry Filter (1.3)
- ✅ Clickable Ranking (1.5)

**Goal:** 4 features shipped, demonstrate value, build confidence

---

### Sprint 3-4 (Weeks 5-8): Core Enhancements
- ✅ Comparative Ranges (1.4)
- ✅ Peak Hour Analysis (2.1)

**Goal:** Add temporal intelligence, enable trend analysis

---

### Sprint 5-8 (Weeks 9-16): Power Features
- ✅ My Commute (2.4)
- ✅ Delay Predictions (2.5)
- ✅ Line Scorecard (2.2)

**Goal:** Personalization + predictive features, increase engagement

---

### Quarter 2: Advanced Features
- ✅ Cascade Visualization (2.3)
- ✅ Interactive Map (3.1)
- ✅ Historical Compare (3.2)

**Goal:** Deep insights, visual appeal, strategic differentiation

---

### Quarter 3-4: Ecosystem
- ✅ Crowdsourcing (3.3)
- ✅ Journey Planner (3.4)
- ✅ Public API (3.5)
- ✅ Accessibility (3.6)

**Goal:** Community building, partnerships, inclusivity

---

## Risk-Adjusted Priorities

### If Resources Are Limited
**Focus on Tier 1 only** (features 1.1-1.5)
- Delivers value with minimal investment
- Proves concept before scaling

### If User Engagement Is Low
**Prioritize personalization** (2.4 My Commute)
- Increases stickiness
- Drives repeat usage

### If Data Quality Is Questioned
**Prioritize transparency** (1.2 Data Quality Indicator)
- Builds trust
- Manages expectations

### If Competition Emerges
**Prioritize differentiation** (2.5 Predictions, 3.1 Map)
- Unique features
- Hard to replicate

---

## Success Metrics by Feature

| Feature | Key Metric | Target |
|---------|------------|--------|
| 1.1 Bottleneck Heatmap | % users clicking bottleneck card | >30% |
| 1.2 Data Quality | Reduction in "data is wrong" feedback | -50% |
| 1.4 Comparative Ranges | % users enabling comparison | >20% |
| 2.1 Peak Hour Analysis | Avg time on peak analysis page | >2 min |
| 2.4 My Commute | % users saving commute preferences | >25% |
| 2.5 Predictions | Click-through on alert banners | >40% |
| 3.1 Interactive Map | % sessions including map view | >35% |

---

## Dependencies & Sequencing

### Must Do First
1. **Bottleneck Heatmap (1.1)** → Unlocks stop-level insights
2. **Data Quality (1.2)** → Builds trust for advanced features

### Can Do in Parallel
- Ferry Filter (1.3) + Clickable Ranking (1.5)
- Peak Hour (2.1) + Comparative Ranges (1.4)

### Requires Prerequisites
- **Cascade Viz (2.3)** → Needs Bottleneck Heatmap (1.1) first
- **Journey Planner (3.4)** → Needs Predictions (2.5) first
- **Public API (3.5)** → Needs stable feature set first

---

## Final Recommendation

**Start with the "Golden Triangle":**

1. **Bottleneck Heatmap (1.1)** - Unlocks unused data
2. **Data Quality Indicator (1.2)** - Builds user trust
3. **Comparative Ranges (1.4)** - Adds temporal context

**Why:** These 3 features address the biggest gaps (stop insights, transparency, historical comparison) with minimal effort, and set the foundation for all advanced features.

**Timeline:** 2-3 weeks for all three, deliverable in a single sprint.

**ROI:** Highest impact-to-effort ratio in the entire roadmap.

---

**Next Step:** Create implementation tickets for 1.1, 1.2, 1.4 and prototype in parallel.
