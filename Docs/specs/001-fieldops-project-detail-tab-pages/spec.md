# Feature Specification: Project Detail — Section Pages

**Feature Branch**: `001-fieldops-project-detail-tab-pages`

**Created**: 2026-05-13

**Status**: Draft

**Input**: User description: "I want the projects section's glass-card class section where all the
overview, daily task, vendor, allocated stock etc section there, those needs to be in separated view
page so that the user can access in unique page not just scrolling down everytime to do some tasks."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Navigate directly to a project section (Priority: P1)

A PM or Admin opens a project and wants to view the Challenges list or submit a Daily Log.
Instead of scrolling past the hero stats and progress cards to find the tabs section, they click
a section card on the project hub page and land directly on the dedicated section page.

**Why this priority**: Core usability pain point — eliminates mandatory scroll + tab switch flow.

**Independent Test**: From `/fieldops/projects/:id`, click the "Challenges" section card →
lands on `/fieldops/projects/:id/challenges` showing full challenge list with project context header.
Can be validated without any other section pages existing.

**Acceptance Scenarios**:

1. **Given** a user is on the project detail hub, **When** they click the "Daily Logs" card,
   **Then** they are navigated to `/fieldops/projects/:id/daily-logs` and see all logs for that
   project with a back link to the hub.
2. **Given** a user bookmarks `/fieldops/projects/:id/devices`, **When** they navigate to it
   directly, **Then** they see the device section page with full project context (project name,
   status, back link), not an error.

---

### User Story 2 — Project hub shows all section entry points clearly (Priority: P2)

The project detail hub (`/fieldops/projects/:id`) no longer has a tabs glass-card. Instead it
shows a section navigation grid — one card per section — with section name, icon, and the current
count badge so users know at a glance where to focus.

**Why this priority**: Without the navigation hub update the new section pages are unreachable
from the project context.

**Independent Test**: Open any project → no tabs glass-card visible → section nav grid present
with at least 7 section cards; each card links to the correct URL.

**Acceptance Scenarios**:

1. **Given** a user is on the hub, **When** they look at the section nav grid, **Then** they see
   cards for: Overview, Daily Logs, Devices, Vendor Work, Challenges, Allocated Stock, Survey vs
   Actual — each with an icon and count badge.
2. **Given** Allocated Stock card is clicked, **Then** the user navigates to the existing
   `/fieldops/projects/:id/stock` page (no new page needed).

---

### User Story 3 — Section pages retain full project context header (Priority: P3)

Every section page (new and existing) shows a consistent header: back link → project hub,
project name + status badge, key meta (projectNumber, clientName, city, PM).

**Why this priority**: Without context the user loses orientation; they should never feel
they left the project.

**Independent Test**: Navigate to `/fieldops/projects/:id/daily-logs` directly → header
shows project name, status badge, back link to hub.

**Acceptance Scenarios**:

1. **Given** a user lands on any section page, **When** they look at the header, **Then** they
   see the project name, status, and a back link labeled with a left-arrow returning to the hub.
2. **Given** the user clicks the back link, **Then** they land on `/fieldops/projects/:id`.

---

### Edge Cases

- What if a project has no daily logs? → Section page shows existing empty-state UI.
- What if `projectId` in URL is invalid? → Section layout shows the same error/redirect flow as
  `ProjectDetail` today (navigate to `/fieldops/projects`).
- Existing bookmarks to `/fieldops/projects/:id` still work — hub page is unchanged except the
  tabs glass-card is replaced by section nav cards.
- Survey vs Actual section card is only shown when `project.surveyDeviceRequirements.length > 0`
  (same condition as the existing tab).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add 5 new routes: `/projects/:id/overview`, `/projects/:id/daily-logs`,
  `/projects/:id/devices`, `/projects/:id/vendor-work`, `/projects/:id/challenges`.
- **FR-002**: `/projects/:id/stock` and `/projects/:id/reconciliation` MUST be reused (already exist).
- **FR-003**: `ProjectDetail.jsx` MUST remove the `activeTab` state and the glass-card tabs section.
- **FR-004**: `ProjectDetail.jsx` MUST render a section navigation grid with cards linking to all
  section pages.
- **FR-005**: A shared `ProjectSectionLayout` component MUST fetch project + dashboard data and
  render a consistent project header (name, status, meta, back link to hub) for all section pages.
- **FR-006**: Each section page MUST show the full content of its section (not a preview/recent-5
  summary), fetching additional data as needed.
- **FR-007**: Hero stat card click handlers that previously scrolled to a tab MUST instead navigate
  to the corresponding section page URL.
- **FR-008**: All new routes MUST be wrapped in `<ProtectedRoute>` with the same roles/rights as
  the existing project routes (`allowedRoles: ['Admin', 'Supervisor']`,
  `requiredRight: PERMISSIONS.PROJECT_MANAGEMENT_PORTAL`).

### Key Entities

- **ProjectSectionLayout**: Shared wrapper — fetches `project` + `dashboard`, renders project
  context header + children.
- **Section pages**: ProjectOverviewSection, ProjectDailyLogsSection, ProjectDevicesSection,
  ProjectVendorWorkSection, ProjectChallengesSection (5 new files).
- **Section nav card**: Visual card component on hub page — icon, label, count, link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero tabs visible on `/fieldops/projects/:id` after the change.
- **SC-002**: All 7 section pages (5 new + 2 existing) load without error and show project context.
- **SC-003**: Navigating to any section URL directly (without going through the hub first) works.
- **SC-004**: Back link on every section page returns to `/fieldops/projects/:id`.
- **SC-005**: ESLint passes with no new errors introduced.

## Assumptions

- No backend API changes required — existing endpoints cover all data needs.
- `PMDailyLogView` (global log viewer at `/fieldops/pm-logs`) remains unchanged; the new
  `ProjectDailyLogsSection` will use the same API but scoped to the project.
- The existing `ProjectAllocatedStockList` and `SurveyReconciliation` pages are reused as-is;
  only their section cards on the hub need to link to them.
- Mobile responsiveness of section nav cards uses the same CSS grid patterns from `fieldops.css`.
