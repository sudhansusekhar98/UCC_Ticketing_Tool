# Implementation Plan: VChart Analytics Dashboard

**Branch**: `004-activity-enhancements-fixes` | **Date**: 2026-05-22 | **Spec**: visactor-next-template replication

**Input**: Replicate the `visactor-next-template-main` dashboard view into the TicketOps ticketing tool, replacing static mock data with live API data and porting TypeScript/Next.js components to React/JSX.

## Summary

Port 5 VChart chart blocks from the `visactor-next-template-main` (Next.js + TypeScript) into a new `AnalyticsDashboard.jsx` page in the existing React 19 + Vite frontend. Replace static data with live backend API data. Add a new backend `/api/tickets/dashboard/trends` endpoint for time-series bar chart data. The new page lives at `/analytics` and does not replace the current `/dashboard` route.

## Technical Context

**Language/Version**: JavaScript (React 19), Node.js 20.x  
**Primary Dependencies**: `@visactor/react-vchart` ^1.12.10, `@visactor/vchart` ^1.12.10 (to install), `date-fns` ^4.1.0 (already installed), `lucide-react` (already installed)  
**Storage**: MongoDB (no schema changes)  
**Testing**: Manual browser testing (no Jest tests for UI charts)  
**Target Platform**: Browser (Vite SPA)  
**Project Type**: Web application (React SPA + Express API)  
**Performance Goals**: Chart render < 500ms; trends API response < 300ms  
**Constraints**: No TypeScript in frontend; VChart must work without SSR  
**Scale/Scope**: Single dashboard page, ~8 new frontend files, 1 new backend endpoint  

## Constitution Check

Constitution file is a template (not filled in for this project). No violations to evaluate.

## Project Structure

### Documentation (this feature)

```text
specs/004-activity-enhancements-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/api.md     # Phase 1 output
└── tasks.md             # Phase 2 output (run /speckit-tasks)
```

### Source Code

```text
frontend/
├── package.json                              # add @visactor/react-vchart, @visactor/vchart
├── src/
│   ├── App.jsx                               # add /analytics route
│   ├── services/api.js                       # add ticketsApi.getTrends()
│   └── pages/dashboard/analytics/
│       ├── AnalyticsDashboard.jsx            # main page (new)
│       ├── AnalyticsDashboard.css            # styles (new)
│       ├── MetricsRow.jsx                    # 4 KPI cards (new)
│       ├── MetricCard.jsx                    # single KPI card with change% (new)
│       ├── TicketTrendChart.jsx              # VChart bar chart + date picker (new)
│       ├── DateRangePicker.jsx               # start/end date inputs (new)
│       ├── TicketsByPriorityChart.jsx        # VChart half-donut pie (new)
│       ├── TicketsByCategoryChart.jsx        # VChart circlePacking (new)
│       └── SLAStatusChart.jsx               # linear progress bars (new)

backend-express/
├── controllers/optimized/
│   └── getDashboardStatsOptimized.js         # add getTicketTrends export (modify)
└── routes/
    └── tickets.routes.js                     # add GET /dashboard/trends (modify)
```

---

## Implementation Tasks

### TASK-01: Install VChart in frontend

**Type**: Setup  
**Files**: `frontend/package.json`

```bash
cd frontend && npm install @visactor/react-vchart @visactor/vchart
```

**Done when**: `import { VChart } from '@visactor/react-vchart'` works without errors.

---

### TASK-02: Backend — `getTicketTrends` controller function

**Type**: Backend  
**File**: `backend-express/controllers/optimized/getDashboardStatsOptimized.js`

Add a new exported function `getTicketTrends`:

```js
export const getTicketTrends = async (req, res, next) => {
  try {
    const user = req.user;
    const { startDate, endDate, siteId } = req.query;

    // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    const rangeMs = end - start;
    const prevEnd = new Date(start - 1);
    const prevStart = new Date(start - rangeMs - 1);

    // Build role-based match (same pattern as getDashboardStatsOptimized)
    let baseMatch = {};
    if (user.role !== 'Admin') {
      const siteFilter = siteId
        ? [new mongoose.Types.ObjectId(siteId)]
        : (user.assignedSites || []).map(s => new mongoose.Types.ObjectId(s));
      const siteAssetIds = await Asset.find({ siteId: { $in: siteFilter } }).distinct('_id').lean();
      baseMatch.$or = [
        { assignedTo: user._id },
        { createdBy: user._id },
        { assetId: { $in: siteAssetIds } }
      ];
    } else if (siteId) {
      const siteAssetIds = await Asset.find({ siteId: new mongoose.Types.ObjectId(siteId) }).distinct('_id').lean();
      baseMatch.assetId = { $in: siteAssetIds };
    }

    // Daily created counts for current range
    const createdTrends = await Ticket.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
    ]);

    // Daily resolved counts for current range
    const resolvedTrends = await Ticket.aggregate([
      { $match: { ...baseMatch, resolvedOn: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedOn' } }, count: { $sum: 1 } } }
    ]);

    // Merge into unified trends array
    const trendMap = {};
    createdTrends.forEach(d => {
      trendMap[d._id] = { date: d._id, created: d.count, resolved: 0 };
    });
    resolvedTrends.forEach(d => {
      if (trendMap[d._id]) trendMap[d._id].resolved = d.count;
      else trendMap[d._id] = { date: d._id, created: 0, resolved: d.count };
    });
    const trends = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // Current period stats
    const [currentTotal, currentResolved, currentOpen] = await Promise.all([
      Ticket.countDocuments({ ...baseMatch, createdAt: { $gte: start, $lte: end } }),
      Ticket.countDocuments({ ...baseMatch, resolvedOn: { $gte: start, $lte: end } }),
      Ticket.countDocuments({ ...baseMatch, status: { $in: ['Open', 'Assigned', 'InProgress'] } })
    ]);

    // Previous period stats
    const [prevTotal, prevResolved, prevOpen] = await Promise.all([
      Ticket.countDocuments({ ...baseMatch, createdAt: { $gte: prevStart, $lte: prevEnd } }),
      Ticket.countDocuments({ ...baseMatch, resolvedOn: { $gte: prevStart, $lte: prevEnd } }),
      Ticket.countDocuments({ ...baseMatch, createdAt: { $gte: prevStart, $lte: prevEnd }, status: { $in: ['Open', 'Assigned', 'InProgress'] } })
    ]);

    res.json({
      success: true,
      data: {
        trends,
        currentStats: { totalCreated: currentTotal, totalResolved: currentResolved, openTickets: currentOpen },
        previousStats: { totalCreated: prevTotal, totalResolved: prevResolved, openTickets: prevOpen }
      }
    });
  } catch (error) {
    next(error);
  }
};
```

**Done when**: `curl .../api/tickets/dashboard/trends` returns `{ success: true, data: { trends: [...] } }`.

---

### TASK-03: Backend route — wire `/dashboard/trends`

**Type**: Backend  
**File**: `backend-express/routes/tickets.routes.js`

Add before the stats route:
```js
import { getTicketTrends } from '../controllers/optimized/getDashboardStatsOptimized.js';
// ...
router.get('/dashboard/trends', protect, getTicketTrends);
```

**Done when**: Route is accessible at `GET /api/tickets/dashboard/trends`.

---

### TASK-04: Frontend API service — `ticketsApi.getTrends`

**Type**: Frontend  
**File**: `frontend/src/services/api.js`

Add to the `ticketsApi` object:
```js
getTrends: (params = {}) => api.get('/tickets/dashboard/trends', { params }),
```

---

### TASK-05: `MetricCard.jsx` — KPI card component

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/MetricCard.jsx`

Port from `visactor-next-template-main/src/components/chart-blocks/charts/metrics/components/metric-card.tsx`.

```jsx
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function MetricCard({ title, value, change, className = '' }) {
  return (
    <section className={`metric-card ${className}`}>
      <h2 className="metric-card-title">{title}</h2>
      <div className="metric-card-value-row">
        <span className="metric-card-value">{value}</span>
        {change !== undefined && <ChangeIndicator change={change} />}
      </div>
      <div className="metric-card-subtitle">Compare to last period</div>
    </section>
  );
}

function ChangeIndicator({ change }) {
  const isPositive = change >= 0;
  return (
    <span className={`change-indicator ${isPositive ? 'positive' : 'negative'}`}>
      {isPositive ? '+' : ''}{Math.round(change * 100)}%
      {isPositive
        ? <ArrowUpRight size={12} />
        : <ArrowDownRight size={12} />}
    </span>
  );
}
```

---

### TASK-06: `MetricsRow.jsx` — 4 KPI cards row

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/MetricsRow.jsx`

Port from `visactor-next-template-main/src/components/chart-blocks/charts/metrics/index.tsx`.

Receives `stats` (from `/dashboard/stats`) and `trendsData` (from `/dashboard/trends`) as props.

```jsx
import MetricCard from './MetricCard';

function calcChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return (current - previous) / previous;
}

export default function MetricsRow({ stats, trendsData }) {
  const curr = trendsData?.currentStats || {};
  const prev = trendsData?.previousStats || {};

  const metrics = [
    {
      title: 'Total Tickets Created',
      value: (curr.totalCreated ?? stats?.totalTickets ?? 0).toLocaleString(),
      change: calcChange(curr.totalCreated, prev.totalCreated),
    },
    {
      title: 'Open Tickets',
      value: (curr.openTickets ?? stats?.openTickets ?? 0).toLocaleString(),
      change: calcChange(curr.openTickets, prev.openTickets) * -1, // lower is better
    },
    {
      title: 'Tickets Resolved',
      value: (curr.totalResolved ?? stats?.resolvedToday ?? 0).toLocaleString(),
      change: calcChange(curr.totalResolved, prev.totalResolved),
    },
    {
      title: 'SLA Compliance',
      value: `${stats?.slaCompliancePercent ?? 0}%`,
      change: undefined, // no previous period comparison for SLA %
    },
  ];

  return (
    <div className="metrics-row">
      {metrics.map(m => (
        <MetricCard key={m.title} {...m} />
      ))}
    </div>
  );
}
```

---

### TASK-07: `DateRangePicker.jsx` — date range inputs

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/DateRangePicker.jsx`

Simple controlled date inputs (no external calendar library needed):

```jsx
export default function DateRangePicker({ startDate, endDate, onChange }) {
  return (
    <div className="date-range-picker">
      <input
        type="date"
        value={startDate}
        max={endDate}
        onChange={e => onChange({ startDate: e.target.value, endDate })}
        className="date-input"
      />
      <span className="date-sep">–</span>
      <input
        type="date"
        value={endDate}
        min={startDate}
        max={new Date().toISOString().split('T')[0]}
        onChange={e => onChange({ startDate, endDate: e.target.value })}
        className="date-input"
      />
    </div>
  );
}
```

---

### TASK-08: `TicketTrendChart.jsx` — VChart grouped bar chart

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/TicketTrendChart.jsx`

Port from `average-tickets-created` chart block. Replace jotai with props.

```jsx
import { VChart } from '@visactor/react-vchart';
import { FilePlus2 } from 'lucide-react';

function buildSpec(trends) {
  // Transform [{ date, created, resolved }] → VChart bar data format
  const data = trends.flatMap(d => [
    { date: d.date, type: 'created', count: d.created },
    { date: d.date, type: 'resolved', count: d.resolved },
  ]);

  return {
    type: 'bar',
    data: [{ id: 'barData', values: data }],
    xField: 'date',
    yField: 'count',
    seriesField: 'type',
    padding: [10, 0, 10, 0],
    legends: { visible: false },
    stack: false,
    tooltip: { trigger: ['click', 'hover'] },
    bar: {
      style: { cornerRadius: [6, 6, 6, 6] },
      state: { hover: { outerBorder: { distance: 2, lineWidth: 2 } } },
    },
    color: ['#60C2FB', '#3161F8'],
  };
}

export default function TicketTrendChart({ trends = [], dateRange, onDateRangeChange }) {
  const avgCreated = trends.length
    ? Math.round(trends.reduce((s, d) => s + d.created, 0) / trends.length)
    : 0;
  const avgResolved = trends.length
    ? Math.round(trends.reduce((s, d) => s + d.resolved, 0) / trends.length)
    : 0;

  return (
    <section className="trend-chart-section">
      <div className="trend-chart-header">
        <div className="chart-title-row">
          <FilePlus2 size={18} />
          <span>Ticket Trend</span>
        </div>
        {/* DateRangePicker is rendered in parent and passed via prop if needed */}
      </div>
      <div className="trend-chart-body">
        <div className="trend-metric-sidebar">
          <div className="trend-metric">
            <span className="trend-metric-dot" style={{ background: '#60C2FB' }} />
            <div>
              <div className="trend-metric-label">Avg. Created / day</div>
              <div className="trend-metric-value">{avgCreated}</div>
            </div>
          </div>
          <div className="trend-metric">
            <span className="trend-metric-dot" style={{ background: '#3161F8' }} />
            <div>
              <div className="trend-metric-label">Avg. Resolved / day</div>
              <div className="trend-metric-value">{avgResolved}</div>
            </div>
          </div>
        </div>
        <div className="trend-chart-canvas">
          {trends.length > 0
            ? <VChart spec={buildSpec(trends)} />
            : <div className="chart-empty">No data for selected range</div>
          }
        </div>
      </div>
    </section>
  );
}
```

---

### TASK-09: `TicketsByPriorityChart.jsx` — VChart half-donut pie

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/TicketsByPriorityChart.jsx`

Port from `ticket-by-channels` chart block. Map `ticketsByPriority` data.

```jsx
import { VChart } from '@visactor/react-vchart';
import { Rss } from 'lucide-react';

function buildSpec(priorities) {
  const total = priorities.reduce((s, p) => s + p.count, 0);
  return {
    type: 'pie',
    legends: [{ type: 'discrete', visible: true, orient: 'bottom' }],
    data: [{ id: 'id0', values: priorities.map(p => ({ type: p.priority, value: p.count })) }],
    valueField: 'value',
    categoryField: 'type',
    outerRadius: 1,
    innerRadius: 0.88,
    startAngle: -180,
    padAngle: 0.6,
    endAngle: 0,
    centerY: '80%',
    layoutRadius: 'auto',
    pie: { style: { cornerRadius: 6 } },
    tooltip: { trigger: ['click', 'hover'] },
    indicator: [
      { visible: true, offsetY: '40%', title: { style: { text: 'Active Tickets', fontSize: 14, opacity: 0.6 } } },
      { visible: true, offsetY: '64%', title: { style: { text: String(total), fontSize: 26 } } },
    ],
  };
}

export default function TicketsByPriorityChart({ priorities = [] }) {
  return (
    <section className="vchart-section">
      <div className="chart-title-row">
        <Rss size={18} />
        <span>Tickets by Priority</span>
      </div>
      <div className="vchart-canvas">
        {priorities.length > 0
          ? <VChart spec={buildSpec(priorities)} />
          : <div className="chart-empty">No priority data</div>
        }
      </div>
    </section>
  );
}
```

---

### TASK-10: `TicketsByCategoryChart.jsx` — VChart circle packing

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/TicketsByCategoryChart.jsx`

Port from `conversions` chart block. Map `ticketsByCategory` data.

```jsx
import { VChart } from '@visactor/react-vchart';
import { CirclePercent } from 'lucide-react';

function buildSpec(categories) {
  return {
    type: 'circlePacking',
    data: [{ id: 'data', values: categories.map(c => ({ name: c.category, value: c.count })) }],
    categoryField: 'name',
    valueField: 'value',
    drill: true,
    padding: 0,
    layoutPadding: 5,
    label: {
      style: {
        fill: 'white',
        stroke: false,
        visible: d => d.depth === 0,
        text: d => String(d.value),
        fontSize: d => d.radius / 2,
        dy: d => d.radius / 8,
      },
    },
    legends: [{ visible: true, orient: 'top', position: 'start', padding: 0 }],
    tooltip: { trigger: ['click', 'hover'] },
  };
}

export default function TicketsByCategoryChart({ categories = [] }) {
  const total = categories.reduce((s, c) => s + c.count, 0);
  return (
    <section className="vchart-section">
      <div className="chart-title-row">
        <CirclePercent size={18} />
        <span>Tickets by Category</span>
      </div>
      <div className="category-total">
        <span className="category-total-value">{total.toLocaleString()}</span>
        <span className="category-total-label"> Tickets</span>
      </div>
      <div className="vchart-canvas">
        {categories.length > 0
          ? <VChart spec={buildSpec(categories)} />
          : <div className="chart-empty">No category data</div>
        }
      </div>
    </section>
  );
}
```

---

### TASK-11: `SLAStatusChart.jsx` — linear progress bars

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/SLAStatusChart.jsx`

Port from `customer-satisfication` chart block. Map SLA/status data.

```jsx
import { SmilePlus, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

export default function SLAStatusChart({ stats }) {
  const total = (stats?.openTickets || 0) + (stats?.inProgressTickets || 0) + (stats?.totalResolved || 0);
  const resolved = stats?.totalResolved || 0;
  const inProgress = stats?.inProgressTickets || 0;
  const open = stats?.openTickets || 0;

  const pct = v => total > 0 ? Math.round((v / total) * 100) : 0;

  const items = [
    { label: 'Resolved', color: '#5fb67a', pct: pct(resolved), icon: <ThumbsUp size={22} /> },
    { label: 'In Progress', color: '#f5c36e', pct: pct(inProgress), icon: <Minus size={22} /> },
    { label: 'Open', color: '#da6d67', pct: pct(open), icon: <ThumbsDown size={22} /> },
  ];

  return (
    <section className="vchart-section">
      <div className="chart-title-row">
        <SmilePlus size={18} />
        <span>Resolution Status</span>
      </div>
      <div className="sla-grid">
        <div className="sla-total-block">
          <div className="sla-total-label">SLA Compliance</div>
          <div className="sla-total-value">{stats?.slaCompliancePercent ?? 0}%</div>
          <div className="sla-total-sub">{stats?.slaBreached ?? 0} breached</div>
        </div>
        {items.map(item => (
          <div key={item.label} className="sla-progress-item">
            <div className="sla-progress-header">
              <span style={{ color: item.color }}>{item.icon}</span>
              <span className="sla-progress-label">{item.label}</span>
              <span className="sla-progress-pct">{item.pct}%</span>
            </div>
            <div className="sla-progress-bar">
              <div
                className="sla-progress-fill"
                style={{ width: `${item.pct}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

### TASK-12: `AnalyticsDashboard.jsx` — main page

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/AnalyticsDashboard.jsx`

Assembles all chart components. Fetches data from both endpoints.

```jsx
import { useState, useEffect } from 'react';
import { subDays, format } from 'date-fns';
import { ticketsApi } from '../../../services/api';
import MetricsRow from './MetricsRow';
import TicketTrendChart from './TicketTrendChart';
import TicketsByPriorityChart from './TicketsByPriorityChart';
import TicketsByCategoryChart from './TicketsByCategoryChart';
import SLAStatusChart from './SLAStatusChart';
import DateRangePicker from './DateRangePicker';
import './AnalyticsDashboard.css';

const today = () => format(new Date(), 'yyyy-MM-dd');
const daysAgo = n => format(subDays(new Date(), n), 'yyyy-MM-dd');

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: daysAgo(29), endDate: today() });
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [statsRes, trendsRes] = await Promise.all([
        ticketsApi.getDashboardStats(),
        ticketsApi.getTrends({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
      ]);
      setStats(statsRes.data.data || statsRes.data);
      setTrendsData(trendsRes.data.data || trendsRes.data);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [dateRange.startDate, dateRange.endDate]);

  if (loading) return <div className="analytics-loading">Loading analytics…</div>;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h1 className="analytics-title">Analytics Dashboard</h1>
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
      </div>

      {/* Row 1: KPI Metrics */}
      <MetricsRow stats={stats} trendsData={trendsData} />

      {/* Row 2: Trend bar chart (2/3) + Category circle packing (1/3) */}
      <div className="analytics-row-2col">
        <div className="analytics-col-2">
          <TicketTrendChart trends={trendsData?.trends || []} dateRange={dateRange} />
        </div>
        <div className="analytics-col-1">
          <TicketsByCategoryChart categories={stats?.ticketsByCategory || []} />
        </div>
      </div>

      {/* Row 3: Priority half-donut (1/2) + SLA progress bars (1/2) */}
      <div className="analytics-row-2col">
        <div className="analytics-col-1">
          <TicketsByPriorityChart priorities={stats?.ticketsByPriority || []} />
        </div>
        <div className="analytics-col-1">
          <SLAStatusChart stats={stats} />
        </div>
      </div>
    </div>
  );
}
```

---

### TASK-13: `AnalyticsDashboard.css` — styles

**Type**: Frontend  
**File**: `frontend/src/pages/dashboard/analytics/AnalyticsDashboard.css`

Write CSS using the project's existing CSS variable system (`--bg-primary`, `--text-primary`, `--border-color`, etc.) matching the template's clean bordered-panel layout:

- `.analytics-dashboard` — max-width container with gap
- `.analytics-header` — flex row, space-between, align-center
- `.analytics-title` — `font-size: 1.5rem; font-weight: 600`
- `.metrics-row` — 4-column grid, bottom border
- `.metric-card` — flex column, padding, border-right on non-last
- `.change-indicator.positive` — green badge, `.negative` — red badge
- `.analytics-row-2col` — CSS grid `grid-template-columns: 2fr 1fr` with border-bottom
- `.analytics-col-2`, `.analytics-col-1` — padding, border-right on non-last
- `.vchart-section` — flex column, gap 8px, min-height 280px
- `.vchart-canvas` — `height: 280px; position: relative`
- `.chart-title-row` — flex, gap 8px, align-center, muted color
- `.trend-chart-body` — flex row
- `.trend-metric-sidebar` — `width: 180px; flex-shrink: 0`
- `.sla-grid` — `display: grid; grid-template-columns: 1fr 1fr; gap: 16px`
- `.sla-progress-bar` — height 6px, rounded, background var(--bg-tertiary)
- `.sla-progress-fill` — height 100%, transition width 0.4s

---

### TASK-14: Add `/analytics` route in `App.jsx`

**Type**: Frontend  
**File**: `frontend/src/App.jsx`

```jsx
import AnalyticsDashboard from './pages/dashboard/analytics/AnalyticsDashboard';

// Inside the routes, after the /dashboard route:
<Route
  path="/analytics"
  element={
    <ProtectedRoute>
      <AnalyticsDashboard />
    </ProtectedRoute>
  }
/>
```

---

### TASK-15: Add sidebar link to Analytics

**Type**: Frontend  
**Files**: Find the sidebar nav component (likely `src/components/Sidebar.jsx` or similar)

Add a "Analytics" nav link pointing to `/analytics` with a `BarChart2` icon from lucide-react.

---

## Complexity Tracking

No constitution violations.

## Risks

| Risk | Mitigation |
|------|-----------|
| VChart bundle size (~800KB gzip) increases initial load | VChart supports tree-shaking; only import needed chart types |
| `resolvedOn` field may not be consistently set on all tickets | Guard with `$ifNull: ['$resolvedOn', null]` in aggregation; filter out nulls |
| Circle packing with 1–2 categories looks empty | Minimum viable: show at least 3 categories; fallback to bar chart if < 3 |
| VChart dark-mode colors don't match CSS variables | Override via VChart's `theme` prop or `color` arrays in spec |
