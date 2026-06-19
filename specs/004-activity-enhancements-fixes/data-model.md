# Data Model: VChart Analytics Dashboard

## New Shapes (Frontend-only, not persisted)

### TicketTrendPoint
```js
{
  date: "YYYY-MM-DD",   // ISO date string
  created: Number,       // tickets created on this date
  resolved: Number       // tickets resolved on this date
}
```

### MetricStat
```js
{
  title: String,         // e.g. "Total Tickets"
  value: String,         // formatted display value e.g. "1,234"
  change: Number,        // decimal e.g. 0.08 = +8%
  rawValue: Number       // numeric for computations
}
```

### DashboardTrendsResponse (new backend endpoint)
```js
{
  success: true,
  data: {
    trends: TicketTrendPoint[],        // one entry per day in requested range
    currentStats: {
      totalCreated: Number,
      totalResolved: Number,
      openTickets: Number,
      slaCompliancePercent: Number
    },
    previousStats: {                   // same window shifted back by range length
      totalCreated: Number,
      totalResolved: Number,
      openTickets: Number,
      slaCompliancePercent: Number
    }
  }
}
```

## Existing Backend Data (no schema changes needed)

The existing `/api/tickets/dashboard/stats` already returns:
- `totalTickets`, `openTickets`, `inProgressTickets`, `resolvedToday`
- `slaBreached`, `slaAtRisk`, `slaCompliancePercent`
- `ticketsByPriority: [{ priority, count }]`
- `ticketsByStatus: [{ status, count }]`
- `ticketsByCategory: [{ category, count }]`

These are directly usable for:
- **Half-donut pie** (TicketsByPriority chart) → `ticketsByPriority`
- **Circle packing** (Conversions chart) → `ticketsByCategory`
- **Linear progress** (SLA/resolution chart) → computed from status counts

## Frontend Component Tree

```
AnalyticsDashboard.jsx          ← main page, fetches data
├── MetricsRow.jsx               ← 4 KPI cards with change %
│   └── MetricCard.jsx           ← individual KPI card
├── TicketTrendChart.jsx         ← VChart bar chart + date range picker
│   └── DateRangePicker.jsx      ← start/end date inputs
├── TicketsByCategoryChart.jsx   ← VChart circlePacking
├── TicketsByPriorityChart.jsx   ← VChart half-donut pie
└── SLAStatusChart.jsx           ← linear progress bars (no VChart needed)
```

## File Locations

### New Frontend Files
```
frontend/src/pages/dashboard/analytics/
├── AnalyticsDashboard.jsx
├── AnalyticsDashboard.css
├── MetricsRow.jsx
├── MetricCard.jsx
├── TicketTrendChart.jsx
├── DateRangePicker.jsx
├── TicketsByCategoryChart.jsx
├── TicketsByPriorityChart.jsx
└── SLAStatusChart.jsx
```

### Modified Backend Files
```
backend-express/controllers/optimized/getDashboardStatsOptimized.js
  + export getTicketTrends (new function)

backend-express/routes/tickets.routes.js
  + GET /dashboard/trends  → getTicketTrends
```

### Modified Frontend Files
```
frontend/src/services/api.js
  + ticketsApi.getTrends(params)

frontend/src/App.jsx
  + Route /analytics → AnalyticsDashboard
```
