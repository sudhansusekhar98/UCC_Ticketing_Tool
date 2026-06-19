# Quickstart: VChart Analytics Dashboard

## Prerequisites

Install VChart in the frontend:
```bash
cd frontend && npm install @visactor/react-vchart @visactor/vchart
```

## Validate after implementation

### 1. Analytics page loads

```
1. Start both backend and frontend dev servers
2. Log in as Admin
3. Navigate to /analytics
4. Expect: Page loads with 4 KPI metric cards, bar chart, circle packing, half-donut pie, and SLA progress bars
5. Expect: No console errors
```

### 2. Bar chart responds to date range

```
1. On the Analytics page, change the start date to 7 days ago
2. Expect: Bar chart updates to show only 7 days of data
3. Expect: KPI "change %" values recalculate based on the new date window
```

### 3. Role-based data filtering

```
1. Log in as a non-Admin engineer with assigned sites
2. Navigate to /analytics
3. Expect: Charts show only tickets from that user's assigned sites
4. Log in as Admin and compare — Admin should see higher total counts
```

### 4. Empty-state handling

```
1. Apply a date range with no ticket data (e.g. far in the future)
2. Expect: Bar chart shows empty state gracefully (no crash)
3. Expect: KPI cards show "0" values, not NaN or undefined
```

### 5. Trends API directly

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/tickets/dashboard/trends?startDate=2026-04-01&endDate=2026-04-30"
```
Expect: JSON with `data.trends` array, `data.currentStats`, `data.previousStats`.

## Development order (recommended)

1. Add `getTicketTrends` to backend controller + route + test with curl
2. Install `@visactor/react-vchart` in frontend
3. Add `ticketsApi.getTrends()` to `services/api.js`
4. Build `AnalyticsDashboard.jsx` skeleton with placeholder charts
5. Implement each chart component one by one (MetricsRow → TicketTrendChart → TicketsByPriorityChart → TicketsByCategoryChart → SLAStatusChart)
6. Add route `/analytics` in `App.jsx`
7. Style with `AnalyticsDashboard.css`
