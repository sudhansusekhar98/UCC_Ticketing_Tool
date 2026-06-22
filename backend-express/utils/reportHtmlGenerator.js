/**
 * reportHtmlGenerator.js
 * Generates self-contained, interactive HTML reports with Chart.js charts.
 * Each function returns a complete HTML string — no dependencies beyond Chart.js CDN.
 */

// ─── Shared palette ──────────────────────────────────────────────────────────
const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
  '#14b8a6', '#6366f1', '#84cc16', '#a855f7',
];

const STATUS_COLORS = {
  Open: '#3b82f6',
  'In Progress': '#f59e0b',
  Resolved: '#10b981',
  Verified: '#06b6d4',
  Closed: '#6b7280',
  Reopened: '#ef4444',
};

const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981',
};

const ASSET_STATUS_COLORS = {
  Operational: '#10b981',
  Degraded: '#f59e0b',
  Offline: '#ef4444',
  Maintenance: '#8b5cf6',
  Spare: '#06b6d4',
};

const RMA_STATUS_COLORS = {
  Requested: '#f59e0b',
  Approved: '#3b82f6',
  Ordered: '#8b5cf6',
  Dispatched: '#06b6d4',
  Received: '#14b8a6',
  Installed: '#10b981',
  Rejected: '#ef4444',
};

// ─── Shared HTML shell ────────────────────────────────────────────────────────
function buildShell({ title, subtitle, filterInfo, kpiCards, chartsHtml, tableHtml, chartScripts }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} – TicketOps Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      font-size: 14px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* ── Header ── */
    .report-header {
      background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #2563eb 100%);
      color: #fff;
      padding: 28px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .report-header-brand { display: flex; align-items: center; gap: 14px; }
    .brand-logo {
      width: 48px; height: 48px; border-radius: 12px;
      background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700; color: #fff;
    }
    .brand-name { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .brand-sub { font-size: 12px; opacity: 0.75; margin-top: 1px; }
    .report-header-meta { text-align: right; }
    .report-title { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; }
    .report-subtitle { font-size: 13px; opacity: 0.8; margin-top: 3px; }
    .report-filter-badge {
      display: inline-block; margin-top: 8px;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 20px;
      padding: 3px 12px; font-size: 11px; opacity: 0.9;
    }
    /* ── Print button ── */
    .print-bar {
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 40px;
      display: flex; align-items: center; gap: 12px;
    }
    .btn-print {
      background: #2563eb; color: #fff; border: none; cursor: pointer;
      padding: 7px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
      display: flex; align-items: center; gap: 6px;
      transition: background 0.15s;
    }
    .btn-print:hover { background: #1d4ed8; }
    .print-hint { font-size: 12px; color: #64748b; }
    /* ── Content wrapper ── */
    .report-content { max-width: 1200px; margin: 0 auto; padding: 32px 40px; }
    /* ── KPI Cards ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--accent, #3b82f6);
      border-radius: 14px 14px 0 0;
    }
    .kpi-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 30px; font-weight: 700; color: #1e293b; margin: 6px 0 2px; line-height: 1; }
    .kpi-sub { font-size: 12px; color: #94a3b8; }
    /* ── Charts grid ── */
    .charts-section { margin-bottom: 32px; }
    .section-title {
      font-size: 16px; font-weight: 700; color: #1e293b;
      margin-bottom: 16px;
      display: flex; align-items: center; gap: 8px;
    }
    .section-title::before {
      content: '';
      width: 4px; height: 18px;
      background: #2563eb;
      border-radius: 2px;
      display: inline-block;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }
    .chart-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .chart-card-wide { grid-column: 1 / -1; }
    .chart-title { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 16px; }
    .chart-wrapper { position: relative; height: 260px; }
    .chart-wrapper-sm { position: relative; height: 200px; }
    /* ── Data table ── */
    .table-section { margin-top: 8px; }
    .table-wrapper { overflow-x: auto; border-radius: 14px; border: 1px solid #e2e8f0; }
    table {
      width: 100%; border-collapse: collapse;
      font-size: 12.5px;
    }
    thead {
      background: linear-gradient(90deg, #1e3a5f, #1e40af);
      color: #fff;
      position: sticky; top: 0;
    }
    thead th {
      padding: 11px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #eff6ff; }
    tbody td { padding: 9px 14px; color: #374151; vertical-align: top; }
    .badge {
      display: inline-block; padding: 2px 9px; border-radius: 20px;
      font-size: 11px; font-weight: 600;
    }
    .empty-state {
      text-align: center; padding: 48px 0; color: #94a3b8; font-size: 13px;
    }
    /* ── Footer ── */
    .report-footer {
      text-align: center; padding: 24px 40px;
      color: #94a3b8; font-size: 11px;
      border-top: 1px solid #e2e8f0; margin-top: 32px;
    }
    /* ── Print styles ── */
    @media print {
      .print-bar { display: none !important; }
      body { background: #fff; }
      .chart-card, .kpi-card { break-inside: avoid; }
    }
  </style>
</head>
<body>

<header class="report-header">
  <div class="report-header-brand">
    <div class="brand-logo">TO</div>
    <div>
      <div class="brand-name">TicketOps</div>
      <div class="brand-sub">UCC Infrastructure Management</div>
    </div>
  </div>
  <div class="report-header-meta">
    <div class="report-title">${title}</div>
    <div class="report-subtitle">${subtitle}</div>
    <div class="report-filter-badge">Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} ${filterInfo ? '&nbsp;|&nbsp;' + filterInfo : ''}</div>
  </div>
</header>

<div class="print-bar">
  <button class="btn-print" onclick="window.print()">
    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
    Print / Save as PDF
  </button>
  <span class="print-hint">Tip: In print dialog, set "Background graphics" to ON for best results.</span>
</div>

<div class="report-content">
  ${kpiCards ? `<div class="kpi-grid">${kpiCards}</div>` : ''}
  ${chartsHtml ? `<div class="charts-section"><div class="section-title">Analytics Overview</div><div class="charts-grid">${chartsHtml}</div></div>` : ''}
  <div class="table-section">
    <div class="section-title">Detailed Records</div>
    <div class="table-wrapper">${tableHtml}</div>
  </div>
</div>

<footer class="report-footer">
  TicketOps &mdash; ${title} &mdash; Confidential &mdash; Generated ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
</footer>

<script>
${chartScripts}
<\/script>
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function kpiCard(label, value, sub = '', accent = '#3b82f6') {
  return `<div class="kpi-card" style="--accent:${accent}">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
  </div>`;
}

function chartCard(title, canvasId, wide = false) {
  return `<div class="chart-card${wide ? ' chart-card-wide' : ''}">
    <div class="chart-title">${title}</div>
    <div class="chart-wrapper"><canvas id="${canvasId}"></canvas></div>
  </div>`;
}

function badgeHtml(text, colorMap) {
  const bg = colorMap?.[text] || '#e2e8f0';
  const isDark = bg !== '#e2e8f0';
  const textColor = isDark ? '#fff' : '#374151';
  return `<span class="badge" style="background:${bg};color:${textColor}">${text || 'N/A'}</span>`;
}

function tableRows(data, columns) {
  if (!data || data.length === 0) {
    return `<tr><td colspan="${columns.length}" class="empty-state">No records found for the selected filters.</td></tr>`;
  }
  return data.map(row => {
    const cells = columns.map(col => {
      const val = row[col.key];
      if (col.badge) return `<td>${badgeHtml(val, col.colorMap)}</td>`;
      return `<td>${val !== null && val !== undefined ? val : '—'}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
}

function buildTable(data, columns) {
  const headers = columns.map(c => `<th>${c.label}</th>`).join('');
  const rows = tableRows(data, columns);
  return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

function buildDonutScript(canvasId, labels, values, colors) {
  return `
  (function() {
    const ctx = document.getElementById('${canvasId}');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{ data: ${JSON.stringify(values)}, backgroundColor: ${JSON.stringify(colors)}, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'right', labels: { font: { size: 12, family: 'Inter' }, padding: 14, usePointStyle: true, pointStyleWidth: 10 } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.parsed + ' (' + Math.round(ctx.parsed / ctx.dataset.data.reduce((a,b)=>a+b,0) * 100) + '%)' } }
        }
      }
    });
  })();`;
}

function buildBarScript(canvasId, labels, values, colors, horizontal = false, label = 'Count') {
  return `
  (function() {
    const ctx = document.getElementById('${canvasId}');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: '${label}',
          data: ${JSON.stringify(values)},
          backgroundColor: ${JSON.stringify(colors)},
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: '${horizontal ? 'y' : 'x'}',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: ${horizontal ? 'true' : 'false'} }, ticks: { font: { size: 11, family: 'Inter' } } },
          y: { grid: { display: ${horizontal ? 'false' : 'true'}, color: '#f1f5f9' }, ticks: { font: { size: 11, family: 'Inter' } } }
        }
      }
    });
  })();`;
}

function buildLineScript(canvasId, labels, values, lineColor = '#2563eb', label = 'Count') {
  return `
  (function() {
    const ctx = document.getElementById('${canvasId}');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: '${label}',
          data: ${JSON.stringify(values)},
          borderColor: '${lineColor}',
          backgroundColor: '${lineColor}22',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '${lineColor}',
          borderWidth: 2.5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11, family: 'Inter' } } }
        }
      }
    });
  })();`;
}

function buildStackedBarScript(canvasId, labels, datasets) {
  const datasetsJson = JSON.stringify(datasets);
  return `
  (function() {
    const ctx = document.getElementById('${canvasId}');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: { labels: ${JSON.stringify(labels)}, datasets: ${datasetsJson} },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: { size: 11, family: 'Inter' }, usePointStyle: true } } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' } } },
          y: { stacked: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11, family: 'Inter' } } }
        }
      }
    });
  })();`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. TICKETS REPORT ─────────────────────────────────────────────────────────
export function generateTicketsReport({ tickets, filterInfo }) {
  const total = tickets.length;
  const resolved = tickets.filter(t => ['Resolved', 'Verified', 'Closed'].includes(t.status)).length;
  const open = tickets.filter(t => t.status === 'Open').length;
  const critical = tickets.filter(t => t.priority === 'Critical').length;
  const breached = tickets.filter(t => t.isSLARestoreBreached).length;

  // Aggregate
  const byStatus = {};
  const byPriority = {};
  const byCategory = {};
  tickets.forEach(t => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });

  const statusLabels = Object.keys(byStatus);
  const statusValues = statusLabels.map(k => byStatus[k]);
  const statusColors = statusLabels.map(k => STATUS_COLORS[k] || PALETTE[statusLabels.indexOf(k) % PALETTE.length]);

  const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
  const prioLabels = priorityOrder.filter(p => byPriority[p]);
  const prioValues = prioLabels.map(k => byPriority[k]);
  const prioColors = prioLabels.map(k => PRIORITY_COLORS[k] || '#94a3b8');

  const catLabels = Object.keys(byCategory);
  const catValues = catLabels.map(k => byCategory[k]);
  const catColors = catLabels.map((_, i) => PALETTE[i % PALETTE.length]);

  const kpiCards = [
    kpiCard('Total Tickets', total, '', '#3b82f6'),
    kpiCard('Open', open, `${total ? Math.round(open / total * 100) : 0}% of total`, '#f59e0b'),
    kpiCard('Resolved / Closed', resolved, `${total ? Math.round(resolved / total * 100) : 0}% resolution rate`, '#10b981'),
    kpiCard('Critical Priority', critical, '', '#ef4444'),
    kpiCard('SLA Breached', breached, `${total ? Math.round(breached / total * 100) : 0}% breach rate`, '#8b5cf6'),
  ].join('');

  const chartsHtml = [
    chartCard('Tickets by Status', 'c-status'),
    chartCard('Tickets by Priority', 'c-priority'),
    chartCard('Tickets by Category', 'c-category', true),
  ].join('');

  const columns = [
    { key: 'ticketNumber', label: 'Ticket #' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status', badge: true, colorMap: STATUS_COLORS },
    { key: 'priority', label: 'Priority', badge: true, colorMap: PRIORITY_COLORS },
    { key: 'category', label: 'Category' },
    { key: 'site', label: 'Site' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'createdBy', label: 'Created By' },
    { key: 'createdAt', label: 'Created On' },
    { key: 'resolvedOn', label: 'Resolved On' },
    { key: 'slaStatus', label: 'SLA' },
  ];

  const tableData = tickets.map(t => ({
    ticketNumber: t.ticketNumber,
    title: t.title,
    status: t.status,
    priority: t.priority,
    category: t.category,
    site: t.siteId?.siteName || 'N/A',
    assignedTo: t.assignedTo?.fullName || 'Unassigned',
    createdBy: t.createdBy?.fullName || 'System',
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : '',
    resolvedOn: t.resolvedOn ? new Date(t.resolvedOn).toLocaleDateString('en-IN') : '—',
    slaStatus: t.isSLARestoreBreached ? 'Breached' : 'On Track',
  }));

  const chartScripts = [
    buildDonutScript('c-status', statusLabels, statusValues, statusColors),
    buildBarScript('c-priority', prioLabels, prioValues, prioColors, false, 'Tickets'),
    buildBarScript('c-category', catLabels, catValues, catColors, false, 'Tickets'),
  ].join('\n');

  return buildShell({
    title: 'Tickets Report',
    subtitle: `${total} tickets across all statuses`,
    filterInfo,
    kpiCards,
    chartsHtml,
    tableHtml: buildTable(tableData, columns),
    chartScripts,
  });
}

// ── 2. EMPLOYEE STATUS REPORT ─────────────────────────────────────────────────
export function generateEmployeesReport({ employees, statsMap, filterInfo }) {
  const total = employees.length;
  const active = employees.filter(e => e.isActive).length;

  const byRole = {};
  employees.forEach(e => { byRole[e.role] = (byRole[e.role] || 0) + 1; });

  const roleLabels = Object.keys(byRole);
  const roleValues = roleLabels.map(k => byRole[k]);
  const roleColors = roleLabels.map((_, i) => PALETTE[i % PALETTE.length]);

  // Top 15 employees by total tickets for bar chart
  const empSorted = [...employees]
    .map(e => ({ name: (e.fullName || '').split(' ')[0], total: statsMap[e._id?.toString()]?.Total || 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const kpiCards = [
    kpiCard('Total Employees', total, '', '#3b82f6'),
    kpiCard('Active', active, `${total ? Math.round(active / total * 100) : 0}% active`, '#10b981'),
    kpiCard('Inactive', total - active, '', '#94a3b8'),
    kpiCard('Roles', roleLabels.length, 'distinct roles', '#8b5cf6'),
  ].join('');

  const chartsHtml = [
    chartCard('Role Distribution', 'c-roles'),
    chartCard('Top Employees by Ticket Volume', 'c-workload'),
  ].join('');

  const columns = [
    { key: 'fullName', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'designation', label: 'Designation' },
    { key: 'primarySite', label: 'Primary Site' },
    { key: 'status', label: 'Status' },
    { key: 'open', label: 'Open' },
    { key: 'inProgress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'total', label: 'Total Tickets' },
    { key: 'lastLogin', label: 'Last Login' },
  ];

  const tableData = employees.map(e => {
    const s = statsMap[e._id?.toString()] || {};
    return {
      fullName: e.fullName,
      email: e.email,
      role: e.role,
      designation: e.designation || '—',
      primarySite: e.siteId?.siteName || 'N/A',
      status: e.isActive ? '✅ Active' : '❌ Inactive',
      open: s.Open || 0,
      inProgress: s.InProgress || 0,
      resolved: (s.Resolved || 0) + (s.Closed || 0),
      total: s.Total || 0,
      lastLogin: e.lastLoginOn ? new Date(e.lastLoginOn).toLocaleDateString('en-IN') : 'Never',
    };
  });

  const chartScripts = [
    buildDonutScript('c-roles', roleLabels, roleValues, roleColors),
    buildBarScript('c-workload', empSorted.map(e => e.name), empSorted.map(e => e.total), empSorted.map((_, i) => PALETTE[i % PALETTE.length]), false, 'Tickets'),
  ].join('\n');

  return buildShell({
    title: 'Employee Status Report',
    subtitle: `${total} employees, ${active} active`,
    filterInfo,
    kpiCards,
    chartsHtml,
    tableHtml: buildTable(tableData, columns),
    chartScripts,
  });
}

// ── 3. ASSET STATUS REPORT ────────────────────────────────────────────────────
export function generateAssetsReport({ assets, rmaMap, filterInfo }) {
  const total = assets.length;
  const operational = assets.filter(a => a.status === 'Operational').length;
  const offline = assets.filter(a => a.status === 'Offline').length;
  const degraded = assets.filter(a => a.status === 'Degraded').length;

  const byStatus = {};
  const byType = {};
  assets.forEach(a => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    const t = a.deviceType || a.assetType || 'Unknown';
    byType[t] = (byType[t] || 0) + 1;
  });

  const statusLabels = Object.keys(byStatus);
  const statusValues = statusLabels.map(k => byStatus[k]);
  const statusColors = statusLabels.map(k => ASSET_STATUS_COLORS[k] || '#94a3b8');

  const typeLabels = Object.keys(byType).sort((a, b) => byType[b] - byType[a]).slice(0, 12);
  const typeValues = typeLabels.map(k => byType[k]);
  const typeColors = typeLabels.map((_, i) => PALETTE[i % PALETTE.length]);

  const kpiCards = [
    kpiCard('Total Assets', total, '', '#3b82f6'),
    kpiCard('Operational', operational, `${total ? Math.round(operational / total * 100) : 0}%`, '#10b981'),
    kpiCard('Offline', offline, '', '#ef4444'),
    kpiCard('Degraded', degraded, '', '#f59e0b'),
  ].join('');

  const chartsHtml = [
    chartCard('Asset Status Distribution', 'c-astatus'),
    chartCard('Top Asset Types', 'c-atype'),
  ].join('');

  const columns = [
    { key: 'assetCode', label: 'Asset Code' },
    { key: 'assetType', label: 'Type' },
    { key: 'deviceType', label: 'Device Type' },
    { key: 'status', label: 'Status', badge: true, colorMap: ASSET_STATUS_COLORS },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'site', label: 'Site' },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'serialNumber', label: 'Serial #' },
    { key: 'rmaCount', label: 'RMAs' },
    { key: 'warrantyEnd', label: 'Warranty End' },
  ];

  const tableData = assets.map(a => {
    const rma = rmaMap[a._id?.toString()] || {};
    return {
      assetCode: a.assetCode,
      assetType: a.assetType,
      deviceType: a.deviceType || '—',
      status: a.status,
      make: a.make || '—',
      model: a.model || '—',
      site: a.siteId?.siteName || 'N/A',
      ipAddress: a.ipAddress || '—',
      serialNumber: a.serialNumber || '—',
      rmaCount: rma.rmaCount || 0,
      warrantyEnd: a.warrantyEndDate ? new Date(a.warrantyEndDate).toLocaleDateString('en-IN') : '—',
    };
  });

  const chartScripts = [
    buildDonutScript('c-astatus', statusLabels, statusValues, statusColors),
    buildBarScript('c-atype', typeLabels, typeValues, typeColors, true, 'Assets'),
  ].join('\n');

  return buildShell({
    title: 'Asset Status Report',
    subtitle: `${total} assets tracked`,
    filterInfo,
    kpiCards,
    chartsHtml,
    tableHtml: buildTable(tableData, columns),
    chartScripts,
  });
}

// ── 4. RMA REPORT ─────────────────────────────────────────────────────────────
export function generateRMAReport({ rmaRequests, filterInfo }) {
  const total = rmaRequests.length;
  const pending = rmaRequests.filter(r => ['Requested', 'Approved', 'Ordered', 'Dispatched'].includes(r.status)).length;
  const completed = rmaRequests.filter(r => r.status === 'Installed').length;
  const rejected = rmaRequests.filter(r => r.status === 'Rejected').length;

  const byStatus = {};
  const byMonth = {};
  rmaRequests.forEach(r => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.createdAt) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    }
  });

  const statusLabels = Object.keys(byStatus);
  const statusValues = statusLabels.map(k => byStatus[k]);
  const statusColors = statusLabels.map(k => RMA_STATUS_COLORS[k] || '#94a3b8');

  const monthKeys = Object.keys(byMonth).sort();
  const monthValues = monthKeys.map(k => byMonth[k]);

  const kpiCards = [
    kpiCard('Total RMAs', total, '', '#3b82f6'),
    kpiCard('Pending', pending, '', '#f59e0b'),
    kpiCard('Completed', completed, `${total ? Math.round(completed / total * 100) : 0}% completion`, '#10b981'),
    kpiCard('Rejected', rejected, '', '#ef4444'),
  ].join('');

  const chartsHtml = [
    chartCard('RMA by Status', 'c-rmastatus'),
    chartCard('RMA Monthly Trend', 'c-rmatrend'),
  ].join('');

  const getTimelineDate = (timeline, status) => {
    if (!timeline || !Array.isArray(timeline)) return null;
    return timeline.find(t => t.status === status)?.changedOn || null;
  };

  const columns = [
    { key: 'rmaId', label: 'RMA ID' },
    { key: 'ticketNo', label: 'Ticket #' },
    { key: 'assetCode', label: 'Asset Code' },
    { key: 'deviceType', label: 'Device Type' },
    { key: 'status', label: 'Status', badge: true, colorMap: RMA_STATUS_COLORS },
    { key: 'site', label: 'Site' },
    { key: 'requestedBy', label: 'Requested By' },
    { key: 'requestedDate', label: 'Requested Date' },
    { key: 'installedDate', label: 'Installed Date' },
    { key: 'vendor', label: 'Vendor' },
  ];

  const tableData = rmaRequests.map(r => ({
    rmaId: r._id.toString().slice(-8).toUpperCase(),
    ticketNo: r.ticketId?.ticketNumber || '—',
    assetCode: r.originalAssetId?.assetCode || '—',
    deviceType: r.originalAssetId?.deviceType || '—',
    status: r.status,
    site: r.siteId?.siteName || '—',
    requestedBy: r.requestedBy?.fullName || '—',
    requestedDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—',
    installedDate: (getTimelineDate(r.timeline, 'Installed') || r.installedOn) ? new Date(getTimelineDate(r.timeline, 'Installed') || r.installedOn).toLocaleDateString('en-IN') : '—',
    vendor: r.vendorDetails?.vendorName || '—',
  }));

  const chartScripts = [
    buildBarScript('c-rmastatus', statusLabels, statusValues, statusColors, false, 'RMAs'),
    buildLineScript('c-rmatrend', monthKeys, monthValues, '#f97316', 'RMAs'),
  ].join('\n');

  return buildShell({
    title: 'RMA Report',
    subtitle: `${total} RMA requests`,
    filterInfo,
    kpiCards,
    chartsHtml,
    tableHtml: buildTable(tableData, columns),
    chartScripts,
  });
}

// ── 5. SPARE STOCK REPORT ─────────────────────────────────────────────────────
export function generateSpareStockReport({ assets, filterInfo }) {
  const total = assets.length;

  const byType = {};
  const bySite = {};
  assets.forEach(a => {
    const t = a.deviceType || a.assetType || 'Unknown';
    byType[t] = (byType[t] || 0) + 1;
    const s = a.siteId?.siteName || 'Unassigned';
    bySite[s] = (bySite[s] || 0) + 1;
  });

  const typeLabels = Object.keys(byType).sort((a, b) => byType[b] - byType[a]);
  const typeValues = typeLabels.map(k => byType[k]);
  const typeColors = typeLabels.map((_, i) => PALETTE[i % PALETTE.length]);

  const siteLabels = Object.keys(bySite).sort((a, b) => bySite[b] - bySite[a]).slice(0, 12);
  const siteValues = siteLabels.map(k => bySite[k]);
  const siteColors = siteLabels.map((_, i) => PALETTE[(i + 4) % PALETTE.length]);

  const kpiCards = [
    kpiCard('Total Spare Items', total, '', '#06b6d4'),
    kpiCard('Device Types', typeLabels.length, 'distinct types', '#8b5cf6'),
    kpiCard('Sites Covered', siteLabels.length, '', '#10b981'),
  ].join('');

  const chartsHtml = [
    chartCard('Spare Stock by Type', 'c-sparetype'),
    chartCard('Spare Stock by Site', 'c-sparesite'),
  ].join('');

  const columns = [
    { key: 'assetCode', label: 'Asset Code' },
    { key: 'assetType', label: 'Type' },
    { key: 'deviceType', label: 'Device Type' },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'serialNumber', label: 'Serial #' },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'mac', label: 'MAC Address' },
    { key: 'site', label: 'Site' },
  ];

  const tableData = assets.map(a => ({
    assetCode: a.assetCode,
    assetType: a.assetType,
    deviceType: a.deviceType || '—',
    make: a.make || '—',
    model: a.model || '—',
    serialNumber: a.serialNumber || '—',
    ipAddress: a.ipAddress || '—',
    mac: a.mac || '—',
    site: a.siteId?.siteName || 'N/A',
  }));

  const chartScripts = [
    buildDonutScript('c-sparetype', typeLabels, typeValues, typeColors),
    buildBarScript('c-sparesite', siteLabels, siteValues, siteColors, true, 'Items'),
  ].join('\n');

  return buildShell({
    title: 'Spare Stock Report',
    subtitle: `${total} spare assets in inventory`,
    filterInfo,
    kpiCards,
    chartsHtml,
    tableHtml: buildTable(tableData, columns),
    chartScripts,
  });
}

// ── 6. WORK ACTIVITY REPORT ───────────────────────────────────────────────────
export function generateWorkActivityReport({ logs, filterInfo }) {
  const allActivities = [];
  logs.forEach(log => {
    log.activities.forEach(a => {
      allActivities.push({ ...a, _user: log.userId, _date: log.date });
    });
  });

  const total = allActivities.length;
  const byCategory = {};
  const byUser = {};
  const byDate = {};
  allActivities.forEach(a => {
    byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    const name = a._user?.fullName?.split(' ')[0] || 'Unknown';
    byUser[name] = (byUser[name] || 0) + 1;
    if (a._date) {
      const key = new Date(a._date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      byDate[key] = (byDate[key] || 0) + 1;
    }
  });

  const catLabels = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]);
  const catValues = catLabels.map(k => byCategory[k]);
  const catColors = catLabels.map((_, i) => PALETTE[i % PALETTE.length]);

  const topUsers = Object.keys(byUser).sort((a, b) => byUser[b] - byUser[a]).slice(0, 12);
  const topUserValues = topUsers.map(k => byUser[k]);

  const dateKeys = Object.keys(byDate);
  const dateValues = dateKeys.map(k => byDate[k]);

  const kpiCards = [
    kpiCard('Total Activities', total, '', '#3b82f6'),
    kpiCard('Log Entries', logs.length, '', '#10b981'),
    kpiCard('Categories', catLabels.length, '', '#8b5cf6'),
    kpiCard('Contributors', topUsers.length, '', '#f97316'),
  ].join('');

  const chartsHtml = [
    chartCard('Activities by Category', 'c-wcat'),
    chartCard('Top Contributors', 'c-wuser'),
    chartCard('Daily Activity Trend', 'c-wtrend', true),
  ].join('');

  // Flatten for table
  const tableRows2 = [];
  logs.forEach(log => {
    const user = log.userId || { fullName: 'Unknown', role: 'N/A' };
    const dateStr = log.date ? new Date(log.date).toLocaleDateString('en-IN') : '—';
    log.activities.forEach(a => {
      tableRows2.push({
        date: dateStr,
        user: user.fullName,
        role: user.role,
        category: a.category,
        type: a.type === 'auto' ? 'Automated' : 'Manual',
        description: (a.description || '').slice(0, 120),
        duration: a.duration ? `${a.duration} mins` : '—',
        timestamp: a.timestamp ? new Date(a.timestamp).toLocaleTimeString('en-IN') : '—',
      });
    });
  });

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'user', label: 'User' },
    { key: 'role', label: 'Role' },
    { key: 'category', label: 'Category' },
    { key: 'type', label: 'Type' },
    { key: 'description', label: 'Description' },
    { key: 'duration', label: 'Duration' },
    { key: 'timestamp', label: 'Time' },
  ];

  const chartScripts = [
    buildDonutScript('c-wcat', catLabels, catValues, catColors),
    buildBarScript('c-wuser', topUsers, topUserValues, topUsers.map((_, i) => PALETTE[i % PALETTE.length]), false, 'Activities'),
    buildLineScript('c-wtrend', dateKeys, dateValues, '#2563eb', 'Activities'),
  ].join('\n');

  return buildShell({
    title: 'Work Activity Report',
    subtitle: `${total} activities logged`,
    filterInfo,
    kpiCards,
    chartsHtml,
    tableHtml: buildTable(tableRows2, columns),
    chartScripts,
  });
}

// ── 7. USER ACTIVITIES REPORT ─────────────────────────────────────────────────
export function generateUserActivitiesReport({ activities, filterInfo }) {
  const total = activities.length;

  const byType = {};
  const byUser = {};
  activities.forEach(a => {
    byType[a.activityType] = (byType[a.activityType] || 0) + 1;
    const name = a.userId?.fullName || 'Unknown';
    byUser[name] = (byUser[name] || 0) + 1;
  });

  const typeLabels = Object.keys(byType).sort((a, b) => byType[b] - byType[a]);
  const typeValues = typeLabels.map(k => byType[k]);
  const typeColors = typeLabels.map((_, i) => PALETTE[i % PALETTE.length]);

  const topUsers = Object.keys(byUser).sort((a, b) => byUser[b] - byUser[a]).slice(0, 15);
  const topUserValues = topUsers.map(k => byUser[k]);

  const kpiCards = [
    kpiCard('Total Activities', total, '', '#3b82f6'),
    kpiCard('Activity Types', typeLabels.length, '', '#8b5cf6'),
    kpiCard('Active Users', topUsers.length, '', '#10b981'),
  ].join('');

  const chartsHtml = [
    chartCard('Activities by Type', 'c-utype'),
    chartCard('Top Active Users', 'c-uuser'),
  ].join('');

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'user', label: 'User' },
    { key: 'role', label: 'Role' },
    { key: 'ticketNo', label: 'Ticket #' },
    { key: 'ticketTitle', label: 'Ticket Title' },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'activityType', label: 'Activity Type' },
    { key: 'content', label: 'Content' },
    { key: 'internal', label: 'Internal' },
  ];

  const tableData = activities.map(a => ({
    date: a.createdOn ? new Date(a.createdOn).toLocaleDateString('en-IN') : '—',
    time: a.createdOn ? new Date(a.createdOn).toLocaleTimeString('en-IN') : '—',
    user: a.userId?.fullName || 'Unknown',
    role: a.userId?.role || '—',
    ticketNo: a.ticketId?.ticketNumber || '—',
    ticketTitle: (a.ticketId?.title || '').slice(0, 60),
    category: a.ticketId?.category || '—',
    priority: a.ticketId?.priority || '—',
    activityType: a.activityType,
    content: (a.content || '').slice(0, 100),
    internal: a.isInternal ? 'Yes' : 'No',
  }));

  const chartScripts = [
    buildDonutScript('c-utype', typeLabels, typeValues, typeColors),
    buildBarScript('c-uuser', topUsers, topUserValues, topUsers.map((_, i) => PALETTE[i % PALETTE.length]), true, 'Activities'),
  ].join('\n');

  return buildShell({
    title: 'User Activities Report',
    subtitle: `${total} ticket activities`,
    filterInfo,
    kpiCards,
    chartsHtml,
    tableHtml: buildTable(tableData, columns),
    chartScripts,
  });
}

// ── 8. STOCK SUMMARY ────────────────────────────────────────────────────────
export function generateStockSummaryReport({ summaryRows, siteLabel }) {
  const total = summaryRows.reduce((s, r) => s + r.quantity, 0);
  const deviceTypes = [...new Set(summaryRows.map(r => r.deviceType))];
  const makes = [...new Set(summaryRows.map(r => r.make))];

  const kpiCards = [
    kpiCard('Total Quantity', total, `${summaryRows.length} line items`, '#3b82f6'),
    kpiCard('Device Types', deviceTypes.length, 'Unique types', '#8b5cf6'),
    kpiCard('Makes', makes.length, 'Unique manufacturers', '#10b981'),
  ].join('');

  // Chart: quantity by device type
  const dtMap = {};
  summaryRows.forEach(r => { dtMap[r.deviceType] = (dtMap[r.deviceType] || 0) + r.quantity; });
  const dtLabels = Object.keys(dtMap).sort((a, b) => dtMap[b] - dtMap[a]);
  const dtValues = dtLabels.map(l => dtMap[l]);
  const dtColors = dtLabels.map((_, i) => PALETTE[i % PALETTE.length]);

  // Chart: quantity by make
  const mkMap = {};
  summaryRows.forEach(r => { mkMap[r.make] = (mkMap[r.make] || 0) + r.quantity; });
  const mkLabels = Object.keys(mkMap).sort((a, b) => mkMap[b] - mkMap[a]).slice(0, 12);
  const mkValues = mkLabels.map(l => mkMap[l]);
  const mkColors = mkLabels.map((_, i) => PALETTE[i % PALETTE.length]);

  const chartsHtml = `
    <div class="charts-section">
      <div class="section-title">Stock Distribution</div>
      <div class="charts-grid">
        ${chartCard('Quantity by Device Type', 'c-sdt')}
        ${chartCard('Quantity by Make', 'c-smk')}
      </div>
    </div>`;

  const columns = [
    { key: 'assetType',  label: 'Asset Type' },
    { key: 'deviceType', label: 'Device Type' },
    { key: 'make',       label: 'Make' },
    { key: 'model',      label: 'Model' },
    { key: 'unit',       label: 'Unit' },
    { key: 'quantity',   label: 'Quantity' },
  ];

  const tableData = summaryRows.map(r => ({
    assetType:  r.assetType,
    deviceType: r.deviceType,
    make:       r.make,
    model:      r.model,
    unit:       r.unit,
    quantity:   r.quantity,
  }));

  const chartScripts = [
    buildDonutScript('c-sdt', dtLabels, dtValues, dtColors),
    buildBarScript('c-smk', mkLabels, mkValues, mkColors, true, 'Quantity'),
  ].join('\n');

  return buildShell({
    title: 'Inventory Stock Summary',
    subtitle: `${total} items across ${deviceTypes.length} device types`,
    filterInfo: `Site: ${siteLabel}`,
    kpiCards,
    chartsHtml,
    tableHtml: buildTable(tableData, columns),
    chartScripts,
  });
}
