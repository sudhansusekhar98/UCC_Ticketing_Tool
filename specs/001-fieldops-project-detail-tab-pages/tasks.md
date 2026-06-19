---
description: "Task list for Field Ops Project Detail â€” Section Pages"
---

# Tasks: Field Ops Project Detail â€” Section Pages

**Input**: Design documents from `specs/001-fieldops-project-detail-tab-pages/`

**Prerequisites**: plan.md âœ… spec.md âœ… research.md âœ… data-model.md âœ… contracts/routes.md âœ…

**Tests**: Not requested â€” no test tasks generated.

**Organization**: Tasks grouped by user story for independent implementation and verification.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)
- Exact file paths included in every task description

---

## Phase 1: Setup

**Purpose**: Create the directory structure for new section page files.

- [X] T001 Create directory `frontend/src/pages/fieldops/sections/` (will hold the 5 new section page files)

**Checkpoint**: Directory exists â†’ ready to create section files

---

## Phase 2: Foundational â€” Shared Section Layout

**Purpose**: Build `ProjectSectionLayout` â€” the shared wrapper that provides project context
(header, back link, loading state, error redirect) to all 5 new section pages.
**No section page can be built without this.**

- [X] T002 Create `frontend/src/pages/fieldops/ProjectSectionLayout.jsx`:
  - Accept props: `children`, `sectionTitle` (string), `sectionIcon` (ReactNode)
  - Use `useParams()` for `id`
  - Fetch `project` and `dashboard` in parallel via `Promise.all([fieldOpsApi.getProjectById(id), fieldOpsApi.getProjectDashboard(id)])`
  - While loading: render `<div className="page-container"><div className="loading-state"><div className="spinner" /><p>Loadingâ€¦</p></div></div>`
  - On error: call `toast.error('Failed to load project')` then `navigate('/fieldops/projects')`
  - Render a header matching the ProjectDetail header style:
    - `<Link to={/fieldops/projects/${id}}><ArrowLeft /></Link>` back link
    - Project name `h1` + status badge using `statusColors` map
    - Meta row: projectNumber, clientName, city, PM name (same icons as ProjectDetail)
    - Section title chip below project name (small label showing which section is active)
  - Pass `project` and `dashboard` to children via render prop: `{children({ project, dashboard })}`
  - Import from lucide-react: ArrowLeft, FileText, Building, MapPin, User
  - Import: fieldOpsApi, useAuthStore, toast, Link, useNavigate, useParams

**Checkpoint**: `ProjectSectionLayout` renders project header + children slot â€” blocks all section pages

---

## Phase 3: User Story 1 â€” Navigate Directly to a Project Section (Priority: P1) ðŸŽ¯ MVP

**Goal**: 5 new dedicated section pages accessible at unique URLs, each using
`ProjectSectionLayout` for project context.

**Independent Test**: Navigate to `/fieldops/projects/:id/daily-logs` directly (paste URL in
browser) â†’ page loads with project header + all daily logs for that project.

### Implementation for User Story 1

- [X] T003 [P] [US1] Create `frontend/src/pages/fieldops/sections/ProjectOverviewSection.jsx`:
  - Use `ProjectSectionLayout` with `sectionTitle="Overview"` and `sectionIcon={<FileText />}`
  - Children render prop receives `{ project }` from layout
  - Render the full `OverviewTab` content (copy the `OverviewTab` component body from
    `ProjectDetail.jsx` into this file as a local function or inline JSX):
    - Project Details section: description, contract period, contractValue, linkedSiteId, linkedSurveyName
    - Location section: siteAddress, city/state, GPS
    - Team section: assignedPM, teamMembers
    - Survey Device Requirements table (if `project.surveyDeviceRequirements?.length > 0`)
  - Imports needed: format (date-fns), fieldops.css

- [X] T004 [P] [US1] Create `frontend/src/pages/fieldops/sections/ProjectDailyLogsSection.jsx`:
  - Use `ProjectSectionLayout` with `sectionTitle="Daily Logs"` and `sectionIcon={<FileText />}`
  - Children render prop receives `{ project, dashboard }` from layout
  - Local state: `logs`, `loading`, `error` â€” fetch via `fieldOpsApi.getPMDailyLogs({ projectId: id })`
    using `useEffect([id])` â€” NO `limit: 5` (fetch all logs)
  - `isAssignedPM`: `project.assignedPM?._id === user?._id || project.teamMembers?.some(tm => tm._id === user?._id)`
  - `canEdit`: `hasRole(['Admin', 'Supervisor'])`
  - Render: "Submit Daily Log" button (if `isAssignedPM || canEdit` and project.status === 'Active'),
    full log list using the same `.log-card` pattern from `DailyLogsTab`, "View All Logs" link to
    `/fieldops/pm-logs?projectId=${id}`
  - Imports: useParams, useEffect, useState, Link, useNavigate, useAuthStore, fieldOpsApi,
    toast, format, BarChart3, Clock, Users, User, Plus, FileText, fieldops.css

- [X] T005 [P] [US1] Create `frontend/src/pages/fieldops/sections/ProjectDevicesSection.jsx`:
  - Use `ProjectSectionLayout` with `sectionTitle="Devices"` and `sectionIcon={<Camera />}`
  - Children render prop receives `{ dashboard }` from layout
  - Derive from `dashboard.allocations` and `dashboard.devices` (same logic as `DevicesTab`):
    `stockInstalled`, `stockAllocated`, `stockFaulty`, `stockRemaining`, `deviceRecords`, `pendingConfig`
  - Render: "Add Device" button (Link to `/fieldops/projects/${id}/devices/new`),
    "Assign Devices" button (Link to `/fieldops/devices/assignment?projectId=${id}`),
    Installation Progress stats grid, Configuration Tracking stats grid,
    pending config notice (if `pendingConfig > 0`),
    "View All Devices" link to `/fieldops/devices?projectId=${id}`,
    "View Assigned Devices List" link to `/fieldops/projects/${id}/devices/assigned`
  - Imports: useParams, Link, Camera, Plus, UserPlus, Package, fieldops.css

- [X] T006 [P] [US1] Create `frontend/src/pages/fieldops/sections/ProjectVendorWorkSection.jsx`:
  - Use `ProjectSectionLayout` with `sectionTitle="Vendor Work"` and `sectionIcon={<Truck />}`
  - Children render prop receives `{ dashboard }` from layout
  - `stats` = `dashboard.vendorWork || {}`
  - Render: "Add Vendor Work Log" button (Link to `/fieldops/projects/${id}/vendor-logs/new`),
    stats grid (totalLogs, totalCrewCount, totalLengthMeters),
    "View All Vendor Logs" link to `/fieldops/vendor-logs?projectId=${id}`
  - Imports: useParams, Link, Truck, Plus, fieldops.css

- [X] T007 [P] [US1] Create `frontend/src/pages/fieldops/sections/ProjectChallengesSection.jsx`:
  - Use `ProjectSectionLayout` with `sectionTitle="Challenges"` and `sectionIcon={<AlertTriangle />}`
  - Children render prop receives `{ dashboard }` from layout
  - Local state: `challenges`, `loading` â€” fetch via
    `fieldOpsApi.getChallengeLogs({ projectId: id })` with NO `limit: 5` constraint
  - `canEdit`: `hasRole(['Admin', 'Supervisor'])`
  - Render:
    - Header row with "Challenge Statistics" h4 + "Report Challenge" button
      (Link to `/fieldops/projects/${id}/challenges/new`)
    - Stats grid from `dashboard.challenges.byStatus || {}`
    - Full challenge list using `.log-card` pattern with severity border color and status badge
      â€” clicking navigates to `/fieldops/projects/${id}/challenges/${challenge._id}`
    - "View All Challenges" link to `/fieldops/challenges?projectId=${id}`
  - Imports: useParams, useState, useEffect, Link, useNavigate, useAuthStore, fieldOpsApi,
    toast, formatDistanceToNow, AlertTriangle, Plus, Clock, User, fieldops.css

- [X] T008 [US1] Add 5 new route entries and imports to `frontend/src/App.jsx`
  (depends on T003â€“T007 files existing):
  - Add imports at top of App.jsx (after existing fieldops imports):
    ```js
    import ProjectOverviewSection from './pages/fieldops/sections/ProjectOverviewSection';
    import ProjectDailyLogsSection from './pages/fieldops/sections/ProjectDailyLogsSection';
    import ProjectDevicesSection from './pages/fieldops/sections/ProjectDevicesSection';
    import ProjectVendorWorkSection from './pages/fieldops/sections/ProjectVendorWorkSection';
    import ProjectChallengesSection from './pages/fieldops/sections/ProjectChallengesSection';
    ```
  - Add 5 routes inside the Routes block, directly after the `/fieldops/projects/:id/edit` route:
    ```jsx
    <Route path="/fieldops/projects/:id/overview"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ProjectOverviewSection />
      </ProtectedRoute>} />
    <Route path="/fieldops/projects/:id/daily-logs"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ProjectDailyLogsSection />
      </ProtectedRoute>} />
    <Route path="/fieldops/projects/:id/devices"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ProjectDevicesSection />
      </ProtectedRoute>} />
    <Route path="/fieldops/projects/:id/vendor-work"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ProjectVendorWorkSection />
      </ProtectedRoute>} />
    <Route path="/fieldops/projects/:id/challenges"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ProjectChallengesSection />
      </ProtectedRoute>} />
    ```

**Checkpoint**: All 5 section pages load correctly when navigated to directly via URL

---

## Phase 4: User Story 2 â€” Hub Page Shows Section Nav Grid (Priority: P2)

**Goal**: `ProjectDetail.jsx` removes the scrolling tabs glass-card and replaces it with a
7-card section navigation grid. Hero stat click handlers updated to navigate instead of scroll.

**Independent Test**: Open `/fieldops/projects/:id` â†’ no tabs visible â†’ 7 section nav cards
present â†’ clicking any card navigates to the correct URL.

### Implementation for User Story 2

- [X] T009 [US2] Remove tab-related code from `frontend/src/pages/fieldops/ProjectDetail.jsx`:
  - Remove `activeTab` state (`const [activeTab, setActiveTab] = useState('overview')`)
  - Remove the entire glass-card div from line ~389 to end of the component (the `<div className="glass-card">` containing `<div className="tabs">` and `<div className="tab-content">`)
  - Remove inline tab component functions at bottom of file: `OverviewTab`, `DailyLogsTab`,
    `DevicesTab`, `VendorTab`, `ChallengesTab`, `ReconciliationTab` (these are now in section pages)
  - Remove unused imports that were only used by those tab components

- [X] T010 [US2] Add section navigation grid to `frontend/src/pages/fieldops/ProjectDetail.jsx`
  (depends on T009 â€” add after the pd-progress-row section):
  - Add a `<div className="glass-card" style={{ padding: '1.5rem' }}>` section with heading
    "Project Sections" and a CSS grid of section nav cards
  - Each card is a `<Link>` (or `<button>` for non-linked items) styled as a card:
    icon, label, count badge. Use inline styles consistent with pd-hero-card pattern.
  - Cards and their links:
    1. Overview â†’ `/fieldops/projects/${id}/overview` (icon: FileText, no count)
    2. Daily Logs â†’ `/fieldops/projects/${id}/daily-logs` (icon: FileText, count: `dashboard?.dailyLogs?.total || 0`)
    3. Devices â†’ `/fieldops/projects/${id}/devices` (icon: Camera, count: `dashboard?.allocations?.totalInstalled || 0`)
    4. Vendor Work â†’ `/fieldops/projects/${id}/vendor-work` (icon: Truck, count: `dashboard?.vendorWork?.totalLogs || 0`)
    5. Challenges â†’ `/fieldops/projects/${id}/challenges` (icon: AlertTriangle, count: `dashboard?.challenges?.total || 0`, highlight open count in red)
    6. Allocated Stock â†’ `/fieldops/projects/${id}/stock` (icon: Package, count: `dashboard?.allocations?.remaining || 0`)
    7. Survey vs Actual â†’ `/fieldops/projects/${id}/reconciliation` (icon: BarChart3, no count)
       â€” render only when `project.surveyDeviceRequirements?.length > 0`
  - Grid layout: `display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem'`

- [X] T011 [US2] Update hero stat card click handlers in `frontend/src/pages/fieldops/ProjectDetail.jsx`
  (depends on T009 â€” replaces setActiveTab calls):
  - "Deployment" hero card: change `onClick={() => { setActiveTab('devices'); ... scroll ... }}`
    to `onClick={() => navigate(\`/fieldops/projects/${id}/devices\`)}`
  - Man-Hours count cell: change `onClick` to `navigate(\`/fieldops/projects/${id}/vendor-work\`)`
  - Challenges count cell: change `onClick` to `navigate(\`/fieldops/projects/${id}/challenges\`)`
  - Daily Log count cell: change `onClick` to `navigate(\`/fieldops/projects/${id}/daily-logs\`)`
  - Ensure `useNavigate` is imported and `navigate` is declared (it should already be, but verify)

**Checkpoint**: Hub page renders section nav grid; clicking any card navigates correctly;
hero stat cards navigate to section pages instead of scrolling

---

## Phase 5: User Story 3 â€” Section Pages Retain Full Project Context Header (Priority: P3)

**Goal**: Verify `ProjectSectionLayout` (built in Phase 2) delivers the required context:
back link, project name, status, meta row on every section page.

**Independent Test**: Navigate directly to `/fieldops/projects/:id/daily-logs` â†’
header shows project name + status badge + back link; clicking back link goes to hub.

### Implementation for User Story 3

- [X] T012 [P] [US3] Verify back link in `frontend/src/pages/fieldops/ProjectSectionLayout.jsx`
  uses `<Link to={\`/fieldops/projects/${id}\`}>` (not `navigate(-1)`) so direct-URL access
  still has a correct back link destination.

- [X] T013 [P] [US3] Verify project meta row in `ProjectSectionLayout.jsx` renders:
  projectNumber (FileText icon), clientName (Building icon), city (MapPin icon),
  PM name (User icon) â€” matching the meta pattern in the original `ProjectDetail.jsx` header
  (`project-meta-item` class).

**Checkpoint**: All section pages show correct project context header on direct URL access

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T014 [P] Run `cd frontend && npm run lint` and fix any ESLint errors introduced by new files
- [X] T015 Manual browser validation per `specs/001-fieldops-project-detail-tab-pages/quickstart.md`:
  - Hub shows 7 section cards (no tabs)
  - All 5 new section URLs load correctly
  - Direct URL access works
  - Back links return to hub
  - Hero stat click handlers navigate correctly
  - Existing `/stock` and `/reconciliation` pages still work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies â€” start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (directory created) â€” BLOCKS all section pages
- **User Story 1 (Phase 3)**: Depends on Phase 2 (ProjectSectionLayout available)
  - T003â€“T007: All parallel (different files)
  - T008: Depends on T003â€“T007 (imports must exist)
- **User Story 2 (Phase 4)**: Depends on Phase 1 only (modifying existing file)
  - Can start in parallel with Phase 3 after Phase 1 is done
  - T009 â†’ T010 â†’ T011 (sequential within Phase 4)
- **User Story 3 (Phase 5)**: Verification of Phase 2 output â€” can run after T002
- **Polish (Phase N)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete â†’ T003â€“T007 parallel â†’ T008 sequential
- **US2 (P2)**: Requires Phase 1 â†’ T009 â†’ T010 â†’ T011 sequential
- **US3 (P3)**: Verification of Phase 2 output; T012 and T013 parallel

### Parallel Opportunities

All 5 section page files (T003â€“T007) can be created simultaneously (different files).
T009/T010/T011 are sequential (same file). T012 and T013 are parallel (verification tasks).

---

## Parallel Example: User Story 1

```text
# All section pages can be created in parallel after T002:
Task T003: ProjectOverviewSection.jsx
Task T004: ProjectDailyLogsSection.jsx
Task T005: ProjectDevicesSection.jsx
Task T006: ProjectVendorWorkSection.jsx
Task T007: ProjectChallengesSection.jsx

# Then sequentially:
Task T008: App.jsx routes (imports all 5 above)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Create directory (T001)
2. Complete Phase 2: Create ProjectSectionLayout (T002)
3. Complete Phase 3 T003â€“T008: Create all 5 section pages + add routes
4. **STOP and VALIDATE**: Navigate to each section URL directly â€” all 5 load âœ…
5. Hub page still has the old tab UI until US2 is done â€” that's acceptable MVP state

### Incremental Delivery

1. T001 + T002 â†’ Foundation ready
2. T003â€“T008 â†’ Section pages accessible by URL (MVP â€” hub still has old tabs as fallback)
3. T009â€“T011 â†’ Hub updated; tabs gone; section nav grid added
4. T012â€“T013 â†’ Context header verified
5. T014â€“T015 â†’ Linted and validated

---

## Notes

- [P] tasks = different files, no shared dependencies â€” safe to run concurrently
- [Story] label maps each task to the spec's user story for traceability
- Verify `fieldOpsApi.getPMDailyLogs` accepts `{ projectId }` param before T004 (check `frontend/src/services/api.js`)
- `statusColors` map (Planning/Active/OnHold/Completed/Cancelled) should be imported from or
  duplicated in `ProjectSectionLayout.jsx` â€” or moved to a shared `fieldops.constants.js` file
- Keep existing routes `/stock` and `/reconciliation` untouched â€” only add section nav cards pointing to them

