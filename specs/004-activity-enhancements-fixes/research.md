# Research: VChart Analytics Dashboard

## Decision 1: Chart Library
- **Decision**: Use `@visactor/react-vchart` v1.12.10 (same version as template)
- **Rationale**: The user explicitly wants to replicate the visactor-next-template. VChart is a production-grade charting library by ByteDance that works with React (not just Next.js). It renders via Canvas/WebGL for performance.
- **Alternatives considered**: Recharts (already installed but user wants VChart's visual style), ECharts (similar but different API)
- **Install**: `npm install @visactor/react-vchart @visactor/vchart` in `frontend/`

## Decision 2: TypeScript → JavaScript Port
- **Decision**: Port all template components from TypeScript `.tsx` to plain JavaScript `.jsx`
- **Rationale**: The frontend uses Vite + React 19 with no TypeScript (all `.jsx` files, no `tsconfig.json` in frontend). Adding TypeScript would require significant config changes out of scope.
- **How to apply**: Remove all type annotations, `type` imports, and interface definitions. Replace jotai `atom` state with React `useState`/`useEffect`.

## Decision 3: Static Data → Live API Data
- **Decision**: Replace all static mock data files with real API calls to the backend
- **Data mapping**:
  - **Metrics row** → existing `/api/tickets/dashboard/stats` (totalTickets, openTickets, resolvedToday, slaCompliancePercent) + previous-period comparison
  - **Bar chart (AverageTicketsCreated)** → NEW endpoint `GET /api/tickets/dashboard/trends?startDate=&endDate=&siteId=`
  - **Circle packing (Conversions)** → `ticketsByCategory` from existing stats response
  - **Half-donut pie (TicketByChannels)** → `ticketsByPriority` from existing stats response
  - **Linear progress (CustomerSatisfication)** → computed from stats: open/inProgress/resolved ratios

## Decision 4: State Management for Date Filter
- **Decision**: Use React `useState` in the parent `AnalyticsDashboard.jsx` component, passed as props to `TicketTrendChart`
- **Rationale**: jotai is not installed; Zustand is project standard. For this use case `useState` is sufficient — no global state needed for date range.

## Decision 5: Dashboard Route Strategy
- **Decision**: Create a new page `AnalyticsDashboard.jsx` at route `/analytics`
- **Rationale**: `TicketingDashboard.jsx` is the current active dashboard at `/dashboard`. A new route avoids breaking changes. The user can later choose to swap them.

## Decision 6: Backend Trends Endpoint
- **Decision**: Add `getTicketTrends` controller in `backend-express/controllers/optimized/getDashboardStatsOptimized.js` with a new route
- **Endpoint**: `GET /api/tickets/dashboard/trends?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&siteId=`
- **Response**: `{ data: { trends: [{ date, created, resolved }], previousStats: {...}, currentStats: {...} } }`
- **Aggregation**: `$dateToString` on `createdAt` (for created count) and `resolvedOn` (for resolved count), `$group` by date

## Decision 7: Metric Change % (vs previous period)
- **Decision**: Backend computes both current period and same-length previous period stats, returns `changePercent` per metric
- **Rationale**: The template shows `+8%` / `-5%` change vs last month for each metric card
- **Implementation**: Backend `getTicketTrends` accepts `startDate`/`endDate`, computes same window shifted back, returns delta

## Resolved Unknowns
- VChart works without Next.js and without TypeScript: **confirmed** — `@visactor/react-vchart` is framework-agnostic
- `<VChart spec={spec} />` is the primary render component — no SSR/server setup needed
- `date-fns` v4.1.0 already installed in frontend — no additional install needed
- `lucide-react` already installed — all icons used in template are available
- `jotai` NOT needed — replaced with React state
