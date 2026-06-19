---
description: "Task list for VChart Analytics Dashboard"
---

# Tasks: VChart Analytics Dashboard

**Input**: Design documents from `/specs/004-activity-enhancements-fixes/`

**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Tests**: No automated test tasks (not requested in spec). Manual validation via quickstart.md.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup

**Purpose**: Install VChart and create the folder structure.

- [x] T001 Install `@visactor/react-vchart` and `@visactor/vchart` in `frontend/` (`cd frontend && npm install @visactor/react-vchart @visactor/vchart`)
- [x] T002 Create folder `frontend/src/pages/dashboard/analytics/` (empty directory placeholder)

**Checkpoint**: `import { VChart } from '@visactor/react-vchart'` resolves without error in any JSX file.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend trends endpoint + frontend API wiring + page skeleton. Required before any chart component can fetch real data.

**⚠️ CRITICAL**: All user story phases depend on this phase completing first.

- [x] T003 Add `getTicketTrends` exported function to `backend-express/controllers/optimized/getDashboardStatsOptimized.js` — daily created/resolved aggregation with date range params, role-based filtering, and previous-period stats (see TASK-02 in plan.md for full implementation)
- [x] T004 Add `GET /dashboard/trends` route in `backend-express/routes/tickets.routes.js` wiring to `getTicketTrends` with `protect` middleware
- [x] T005 [P] Add `getTrends: (params = {}) => api.get('/tickets/dashboard/trends', { params })` to the `ticketsApi` object in `frontend/src/services/api.js`
- [x] T006 [P] Create `frontend/src/pages/dashboard/analytics/AnalyticsDashboard.jsx` with skeleton layout: imports, `useState` for dateRange and loading, `useEffect` calling both `ticketsApi.getDashboardStats()` and `ticketsApi.getTrends()`, loading placeholder, and section placeholders for all 5 chart blocks
- [x] T007 Add `/analytics` route in `frontend/src/App.jsx` importing `AnalyticsDashboard` from `./pages/dashboard/analytics/AnalyticsDashboard` wrapped in `<ProtectedRoute>`

**Checkpoint**: Navigate to `/analytics` in browser — page loads with loading state → resolves to blank sections, no console errors. `curl /api/tickets/dashboard/trends` returns `{ success: true, data: { trends: [...] } }`.

---

## Phase 3: User Story 1 — KPI Metrics Row (Priority: P1) 🎯 MVP

**Goal**: Show 4 KPI cards (Total Created, Open Tickets, Resolved, SLA Compliance) with % change vs previous period at the top of the analytics page.

**Independent Test**: Navigate to `/analytics` → top row shows 4 labelled KPI cards with numeric values and a colour-coded change% badge (green for positive, red for negative). No crash when previous stats are zero.

### Implementation

- [x] T008 [P] [US1] Create `frontend/src/pages/dashboard/analytics/MetricCard.jsx` — single KPI card with `title`, `value`, `change` (decimal) props; renders change% badge using `ArrowUpRight`/`ArrowDownRight` from lucide-react with `positive`/`negative` CSS classes
- [x] T009 [P] [US1] Create `frontend/src/pages/dashboard/analytics/MetricsRow.jsx` — 4-column row, receives `stats` (from `/dashboard/stats`) and `trendsData` (from `/dashboard/trends`) props; computes `calcChange(current, previous)` helper; renders 4 `MetricCard` instances (Total Created, Open Tickets, Resolved, SLA Compliance)
- [x] T010 [US1] Wire `MetricsRow` into `AnalyticsDashboard.jsx` — replace the MetricsRow placeholder section with `<MetricsRow stats={stats} trendsData={trendsData} />`

**Checkpoint**: KPI metrics row visible on `/analytics` with real data values and change% indicators.

---

## Phase 4: User Story 2 — Ticket Trend Bar Chart (Priority: P1)

**Goal**: Show a VChart grouped bar chart of daily created vs resolved ticket counts for a selectable date range, with average per-day sidecards.

**Independent Test**: The bar chart renders with two colour-coded bar series (created = `#60C2FB`, resolved = `#3161F8`). Changing the date range inputs updates the chart. Average created/resolved counts shown in sidebar update to match filtered range. Empty range shows "No data" state without crash.

### Implementation

- [x] T011 [P] [US2] Create `frontend/src/pages/dashboard/analytics/DateRangePicker.jsx` — two `<input type="date">` elements (start/end) with `max`/`min` constraints; calls `onChange({ startDate, endDate })` on change
- [x] T012 [US2] Create `frontend/src/pages/dashboard/analytics/TicketTrendChart.jsx` — `buildSpec(trends)` function transforms `[{ date, created, resolved }]` into VChart bar spec with `seriesField: 'type'`; sidebar shows avg created/resolved; renders `<VChart spec={...} />` or empty state; receives `trends` array as prop
- [x] T013 [US2] Wire `DateRangePicker` and `TicketTrendChart` into `AnalyticsDashboard.jsx` — `DateRangePicker` in page header calls `setDateRange`, `TicketTrendChart` receives `trends={trendsData?.trends || []}` prop

**Checkpoint**: Bar chart visible on `/analytics`, reacts to date range changes, shows real daily ticket data.

---

## Phase 5: User Story 3 — Tickets by Priority Chart (Priority: P2)

**Goal**: Show a VChart half-donut (semicircle) pie chart with tickets grouped by priority (P1/P2/P3/P4) and a centre indicator showing total active tickets.

**Independent Test**: Half-donut chart renders in the lower-left section of the analytics page. Hover tooltip shows priority label and count. Centre indicator shows total active ticket count. Empty state shown gracefully when `ticketsByPriority` is empty.

### Implementation

- [x] T014 [US3] Create `frontend/src/pages/dashboard/analytics/TicketsByPriorityChart.jsx` — `buildSpec(priorities)` function generates VChart pie spec with `startAngle: -180`, `endAngle: 0`, `innerRadius: 0.88`, `centerY: '80%'`, and `indicator` showing total count; renders `<VChart spec={...} />` with `Rss` icon title; receives `priorities: [{ priority, count }]` as prop
- [x] T015 [US3] Wire `TicketsByPriorityChart` into `AnalyticsDashboard.jsx` — replace its placeholder section with `<TicketsByPriorityChart priorities={stats?.ticketsByPriority || []} />`

**Checkpoint**: Half-donut chart visible on `/analytics` lower-left, shows real priority data with centre count.

---

## Phase 6: User Story 4 — Tickets by Category Chart (Priority: P2)

**Goal**: Show a VChart circle packing chart where each category is a proportionally-sized circle, displaying total ticket count above the chart.

**Independent Test**: Circle packing chart renders in the upper-right section with one bubble per ticket category. Bubble size is proportional to count. Drill-down on click works. Total ticket count shown above chart. Renders gracefully with 0–2 categories.

### Implementation

- [x] T016 [US4] Create `frontend/src/pages/dashboard/analytics/TicketsByCategoryChart.jsx` — `buildSpec(categories)` generates VChart `circlePacking` spec with `drill: true`, white label text visible only at `depth === 0`; shows total count above chart; renders `<VChart spec={...} />` with `CirclePercent` icon title; receives `categories: [{ category, count }]` as prop
- [x] T017 [US4] Wire `TicketsByCategoryChart` into `AnalyticsDashboard.jsx` — replace its placeholder section with `<TicketsByCategoryChart categories={stats?.ticketsByCategory || []} />`

**Checkpoint**: Circle packing chart visible on `/analytics` upper-right, shows real category data.

---

## Phase 7: User Story 5 — SLA Status + Full Page Polish (Priority: P3)

**Goal**: Show resolution status as three linear progress bars (Resolved / In Progress / Open) plus SLA compliance %, and apply full page CSS styling to match the template's clean bordered-panel layout.

**Independent Test**: Lower-right section shows three labelled progress bars with correct percentages based on live ticket status counts. SLA compliance % is visible. Full page layout matches template grid (metrics row on top, 2/3 + 1/3 second row, 1/2 + 1/2 third row). Light and dark mode both render correctly with project CSS variables.

### Implementation

- [x] T018 [US5] Create `frontend/src/pages/dashboard/analytics/SLAStatusChart.jsx` — renders 3 progress bars (Resolved/InProgress/Open) computed from `stats` props; shows `slaCompliancePercent` and `slaBreached` counts; uses `SmilePlus`, `ThumbsUp`, `Minus`, `ThumbsDown` from lucide-react; no VChart needed
- [x] T019 [US5] Wire `SLAStatusChart` into `AnalyticsDashboard.jsx` — replace its placeholder section with `<SLAStatusChart stats={stats} />`
- [x] T020 [P] [US5] Create `frontend/src/pages/dashboard/analytics/AnalyticsDashboard.css` — full stylesheet using project CSS variables (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--text-primary`, `--text-secondary`, `--border-color`); defines: `.analytics-dashboard`, `.analytics-header`, `.analytics-title`, `.metrics-row` (4-col grid, border-bottom), `.metric-card` (border-right on non-last), `.change-indicator.positive/.negative` (green/red badges), `.analytics-row-2col` (`grid-template-columns: 2fr 1fr` with border variants), `.vchart-section` (flex col, min-height 280px), `.vchart-canvas` (height 280px, position relative), `.chart-title-row` (flex, gap), `.trend-chart-body` (flex row), `.trend-metric-sidebar` (width 180px, flex-shrink 0), `.sla-grid` (2-col grid), `.sla-progress-bar` (height 6px, bg tertiary, rounded), `.sla-progress-fill` (transition width 0.4s), `.chart-empty` (centered muted text), `.date-range-picker` (flex row, gap), `.date-input` (styled to match project inputs), `.analytics-loading` (centered loading text)
- [x] T021 [US5] Add sidebar navigation link for Analytics: find the sidebar nav component (search `src/components/` for sidebar/nav files), add a link to `/analytics` with `BarChart2` icon from lucide-react, label "Analytics"

**Checkpoint**: Full analytics page matches template layout. All 5 chart blocks visible and functional. Sidebar link navigates to `/analytics`. CSS variables ensure correct light/dark mode rendering.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge cases, and cleanup.

- [ ] T022 [P] Test empty-state rendering: apply a future date range in the date picker → verify bar chart shows "No data" without crash
- [ ] T023 [P] Test role-based data: log in as non-Admin engineer → verify analytics page shows only that user's site data (counts differ from Admin view)
- [x] T024 Verify `npm run lint` (ESLint) passes with zero new errors in all new `.jsx` files under `frontend/src/pages/dashboard/analytics/`
- [x] T025 [P] Verify `resolvedOn` null safety: confirm `getTicketTrends` backend function handles tickets with no `resolvedOn` field (filter `resolvedOn: { $ne: null }` in the resolved aggregation match)
- [ ] T026 Run quickstart.md validation scenarios (all 5 test cases from `specs/004-activity-enhancements-fixes/quickstart.md`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (VChart installed) — **BLOCKS all user stories**
- **Phase 3 (US1 — Metrics)**: Depends on Phase 2
- **Phase 4 (US2 — Bar Chart)**: Depends on Phase 2; T011 independent, T012 depends on T011
- **Phase 5 (US3 — Priority Chart)**: Depends on Phase 2; independent of Phases 3–4
- **Phase 6 (US4 — Category Chart)**: Depends on Phase 2; independent of Phases 3–5
- **Phase 7 (US5 — SLA + Polish)**: Depends on Phases 3–6 being wired (T018–T019 require `stats` data flowing); T020 CSS can start after Phase 2
- **Phase 8 (Polish)**: Depends on Phase 7 completion

### User Story Dependencies

- **US1 (P1)**: Only needs `stats` from existing endpoint — starts after Phase 2
- **US2 (P1)**: Needs `trendsData.trends` from new endpoint — starts after Phase 2 (T003/T004 complete)
- **US3 (P2)**: Needs `stats.ticketsByPriority` — starts after Phase 2
- **US4 (P2)**: Needs `stats.ticketsByCategory` — starts after Phase 2
- **US5 (P3)**: Needs `stats` — starts after Phase 2; CSS (T020) can run in parallel with US1–US4

### Within Each User Story

- Model components → wire into page
- No cross-story blocking dependencies (all charts read from the same two API responses)

### Parallel Opportunities (within Phase 2)

T005 (API service) and T006 (skeleton page) can run in parallel with each other — different files.

---

## Parallel Example: Phase 2 Foundational

```
Parallel group A:
  T003 + T004  → backend endpoint (sequential: T004 depends on T003 being exported)

Parallel group B (after T001 VChart installed):
  T005  → frontend/src/services/api.js
  T006  → frontend/src/pages/dashboard/analytics/AnalyticsDashboard.jsx
  T007  → frontend/src/App.jsx

Group B tasks can run concurrently — all different files.
```

## Parallel Example: User Stories 3–4 (after Phase 2)

```
US3 (T014–T015) and US4 (T016–T017) touch entirely different files.
They can be implemented simultaneously by two developers.
```

---

## Implementation Strategy

### MVP First (US1 + US2 only)

1. Phase 1: Install VChart
2. Phase 2: Backend endpoint + page skeleton + route
3. Phase 3 (US1): Metrics row → **KPI cards visible with real data**
4. Phase 4 (US2): Bar chart with date picker → **Core chart visible**
5. **STOP and VALIDATE** — demo-ready with two of five blocks functional

### Incremental Delivery

1. Setup + Foundational → page reachable at `/analytics`
2. US1 Metrics row → first visual value
3. US2 Bar chart → main chart block live
4. US3 Priority chart → second chart row starts filling
5. US4 Category chart → second chart row complete
6. US5 SLA + CSS polish → full page matches template design

---

## Notes

- [P] tasks = different files, no cross-task dependencies
- VChart specs are plain JS objects — no TypeScript types needed
- The `resolvedOn` field on Ticket must be non-null for resolved trends to aggregate correctly (T025 guards this)
- Dark mode: VChart charts pick up `color` arrays from the spec, not CSS variables — set explicit hex colours in each spec
- Sidebar file location for T021: search `frontend/src/components/` or `frontend/src/layout/` for the nav/sidebar component
