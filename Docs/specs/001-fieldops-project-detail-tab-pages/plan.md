# Implementation Plan: Field Ops Project Detail — Section Pages

**Branch**: `001-fieldops-project-detail-tab-pages` | **Date**: 2026-05-13 | **Spec**: `specs/001-fieldops-project-detail-tab-pages/spec.md`

**Input**: Feature specification from `specs/001-fieldops-project-detail-tab-pages/spec.md`

## Summary

Replace the glass-card tabs section in `ProjectDetail.jsx` with a section navigation grid
where each section (Overview, Daily Logs, Devices, Vendor Work, Challenges, Allocated Stock,
Survey vs Actual) is its own dedicated page with a direct URL. A shared `ProjectSectionLayout`
wrapper provides consistent project context header across all section pages. No backend changes
required — all APIs already support `projectId` scoping.

## Technical Context

**Language/Version**: JavaScript (React 19 / Vite)

**Primary Dependencies**: React Router 7 (`useNavigate`, `useParams`, `Link`), lucide-react,
`fieldOpsApi` (existing Axios service), date-fns, react-hot-toast

**Storage**: N/A (frontend-only change)

**Testing**: ESLint (`npm run lint`) + manual browser verification per quickstart.md

**Target Platform**: Web browser (same as existing frontend)

**Project Type**: Web application — React SPA

**Performance Goals**: Section pages load in ≤ 1s on a warm connection (same as current tab
content load — no additional API calls beyond what tabs already make)

**Constraints**: Zero new backend endpoints; no new npm packages; maintain all existing
behavior for `/projects/:id/stock` and `/projects/:id/reconciliation`

**Scale/Scope**: 7 section pages, 2 modified files (`ProjectDetail.jsx`, `App.jsx`),
6 new files (1 layout + 5 section pages)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Layered Architecture | ✅ Pass | Pages → Services (api.js) pattern maintained; no direct fetch calls |
| II. RBAC | ✅ Pass | All new routes use same `protect` + `authorize` pattern; `ProtectedRoute` with same roles/rights as existing project routes |
| III. Real-Time & Resilient Data | ✅ Pass | React Query not used here (pattern consistent with existing fieldops pages that use useState + useEffect); no Socket.IO changes |
| IV. Security & Data Integrity | ✅ Pass | No new API endpoints; no sensitive field changes |
| V. Observability | ✅ Pass | No cron-job or background job changes |

## Project Structure

### Documentation (this feature)

```text
specs/001-fieldops-project-detail-tab-pages/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Component props + API mapping
├── quickstart.md        # Validation steps
└── contracts/
    └── routes.md        # Route contracts + file locations
```

### Source Code

```text
frontend/src/
├── App.jsx                                         (modified — 5 new routes + imports)
└── pages/fieldops/
    ├── ProjectDetail.jsx                           (modified — remove tabs, add section nav)
    ├── ProjectSectionLayout.jsx                    (new — shared project context wrapper)
    └── sections/
        ├── ProjectOverviewSection.jsx              (new)
        ├── ProjectDailyLogsSection.jsx             (new)
        ├── ProjectDevicesSection.jsx               (new)
        ├── ProjectVendorWorkSection.jsx            (new)
        └── ProjectChallengesSection.jsx            (new)
```

**Structure Decision**: Web application option — frontend only. No backend directory changes.
Sections subdirectory keeps new files organized without cluttering `fieldops/` root.

## Implementation Notes

### ProjectSectionLayout.jsx (new)

Fetches `project` via `fieldOpsApi.getProjectById(id)` and `dashboard` via
`fieldOpsApi.getProjectDashboard(id)` using `Promise.all`. Renders:
- Back link to `/fieldops/projects/:id`
- Project name + status badge + meta row (projectNumber, clientName, city, PM)
- Loading spinner while fetching
- Error redirect to `/fieldops/projects` on fetch failure
- Children via `{children}` slot

Section pages call `useParams()` for `id` and wrap content in this layout.

### ProjectDetail.jsx changes

**Remove**: `activeTab` state, the glass-card `<div>` containing tabs + tab-content.
**Remove**: Inline tab component functions (OverviewTab, DailyLogsTab, DevicesTab,
VendorTab, ChallengesTab, ReconciliationTab) — these are extracted into section pages.

**Keep**: Header, hero stats row, progress + timeline cards.

**Add**: Section navigation grid below the progress row — 7 cards:

| Card | Icon | Count source | Links to |
|------|------|-------------|----------|
| Overview | FileText | — | `/fieldops/projects/:id/overview` |
| Daily Logs | FileText | `dashboard.dailyLogs.total` | `/fieldops/projects/:id/daily-logs` |
| Devices | Camera | `dashboard.allocations.totalInstalled` | `/fieldops/projects/:id/devices` |
| Vendor Work | Truck | `dashboard.vendorWork.totalLogs` | `/fieldops/projects/:id/vendor-work` |
| Challenges | AlertTriangle | `dashboard.challenges.total` | `/fieldops/projects/:id/challenges` |
| Allocated Stock | Package | `dashboard.allocations.remaining` | `/fieldops/projects/:id/stock` |
| Survey vs Actual | BarChart3 | — | `/fieldops/projects/:id/reconciliation` |

Survey vs Actual card: conditionally rendered when `project.surveyDeviceRequirements?.length > 0`.

**Update hero stat click handlers**: Replace `setActiveTab` + scroll calls with
`navigate('/fieldops/projects/${id}/devices')` etc.

### Section pages — content

Each section page uses `ProjectSectionLayout` and renders the equivalent of its former tab content
but with full data (not dashboard preview subset):

- **ProjectOverviewSection**: Renders `OverviewTab` content using layout's `project` prop.
- **ProjectDailyLogsSection**: Fetches all logs via `fieldOpsApi.getPMDailyLogs({ projectId: id })`,
  renders full log list + Submit Daily Log button (if `isAssignedPM || canEdit`).
- **ProjectDevicesSection**: Uses layout's `dashboard.allocations` + `dashboard.devices` stats.
  Renders same DevicesTab content with Add Device + Assign Devices buttons.
- **ProjectVendorWorkSection**: Uses layout's `dashboard.vendorWork` stats. Renders same VendorTab
  content with Add Vendor Work Log button.
- **ProjectChallengesSection**: Fetches ALL challenges (no `limit: 5`) via
  `fieldOpsApi.getChallengeLogs({ projectId: id })`. Renders stats grid + full challenge list.

## Complexity Tracking

> No constitution violations — no complexity justification needed.
