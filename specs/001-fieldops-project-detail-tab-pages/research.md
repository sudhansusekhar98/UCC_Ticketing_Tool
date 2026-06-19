# Research: Project Detail Section Pages

## Decision: React Router URL-based navigation (no tab state)

**Decision**: Replace `activeTab` useState with React Router routes — one URL per section.

**Rationale**: Direct URLs are bookmarkable, shareable, and survive page refresh.
Using URL state eliminates the forced-scroll UX issue entirely.

**Alternatives considered**:
- Keep tabs but add anchor-based scroll — rejected; still requires scroll to find tabs.
- Use React Router nested routes with `<Outlet>` — viable but adds layout complexity
  not justified for this scope.

---

## Decision: Shared `ProjectSectionLayout` wrapper

**Decision**: A single `ProjectSectionLayout.jsx` component fetches project + dashboard
data and renders the project header + children via a render prop or children slot.

**Rationale**: Avoids duplicating the header/fetch logic across 5 new section pages.
The component is thin — 60-80 lines — acceptable without further abstraction.

**Alternatives considered**:
- Pass project data via React Router `location.state` — rejected; breaks direct URL access.
- React Context for project data — over-engineered for this scope.

---

## Decision: Route disambiguation for `/devices`

**Decision**: New project-scoped devices page uses `/fieldops/projects/:id/devices`.
React Router 7 correctly matches this before `/devices/new` and `/devices/assigned`
because those have additional path segments.

**Rationale**: Consistent pattern with other sections; no conflict with existing routes.

---

## Decision: Daily Logs section fetches all logs (not just dashboard recent-5)

**Decision**: `ProjectDailyLogsSection` calls `fieldOpsApi.getPMDailyLogs({ projectId })`
directly rather than using `dashboard.recentLogs`. 

**Rationale**: The dedicated section page should show complete data, not the preview
subset used on the hub dashboard card.

---

## Decision: Challenges section reuses `ChallengesTab` logic but fetches all records

**Decision**: The challenges section page fetches `fieldOpsApi.getChallengeLogs({ projectId })`
without the `limit: 5` constraint used in the tab version.

**Rationale**: Full data access in a dedicated page vs. preview in dashboard card.

---

## Decision: Reuse existing standalone pages for Stock and Reconciliation

**Decision**: `/fieldops/projects/:id/stock` (ProjectAllocatedStockList) and
`/fieldops/projects/:id/reconciliation` (SurveyReconciliation) are reused as-is.
The hub section nav cards simply link to these existing routes.

**Rationale**: These pages already have full standalone implementations; no duplication needed.
