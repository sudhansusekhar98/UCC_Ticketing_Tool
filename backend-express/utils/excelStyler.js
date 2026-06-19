/**
 * excelStyler.js
 * Generates beautifully styled Excel workbooks using ExcelJS.
 * Each function takes processed data and returns an ExcelJS Workbook buffer.
 *
 * Design:
 *  - Navy header row with white bold text
 *  - Colour-coded status/priority badges via cell fills
 *  - Alternating row shading for readability
 *  - Frozen header row + auto-filters
 *  - Consistent column widths and number formats
 */

import ExcelJS from 'exceljs';

// ─── Colour Palette ───────────────────────────────────────────────────────────
const C = {
  // Header
  headerBg: '1E3A5F',   // deep navy
  headerFg: 'FFFFFF',

  // Row alternating
  rowEven: 'F8FAFC',
  rowOdd:  'FFFFFF',

  // Status fills (ARGB, no '#')
  statusOpen:        'DBEAFE',  // blue-100
  statusInProgress:  'FEF3C7',  // amber-100
  statusResolved:    'D1FAE5',  // green-100
  statusVerified:    'CFFAFE',  // cyan-100
  statusClosed:      'F1F5F9',  // slate-100
  statusReopened:    'FEE2E2',  // red-100

  // Priority fills
  priorCritical: 'FEE2E2',  // red-100
  priorHigh:     'FFEDD5',  // orange-100
  priorMedium:   'FEF9C3',  // yellow-100
  priorLow:      'DCFCE7',  // green-100

  // Asset status
  assetOperational: 'D1FAE5',
  assetDegraded:    'FEF3C7',
  assetOffline:     'FEE2E2',
  assetMaintenance: 'EDE9FE',
  assetSpare:       'CFFAFE',

  // RMA status
  rmaRequested:  'FEF3C7',
  rmaApproved:   'DBEAFE',
  rmaOrdered:    'EDE9FE',
  rmaDispatched: 'CFFAFE',
  rmaReceived:   'CCFBF1',
  rmaInstalled:  'D1FAE5',
  rmaRejected:   'FEE2E2',

  // Active/Inactive
  active:   'D1FAE5',
  inactive: 'FEE2E2',

  // SLA
  slaOk:      'D1FAE5',
  slaBreached:'FEE2E2',

  // Totals row
  totals: 'E2E8F0',
};

// ─── Shared helpers ───────────────────────────────────────────────────────────
function fgText(hexArgb) {
  return { argb: 'FF' + hexArgb };
}

function bgFill(hexArgb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hexArgb } };
}

const THIN_BORDER = {
  top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const BASE_FONT = { name: 'Calibri', size: 10 };
const HEADER_FONT = { name: 'Calibri', size: 10, bold: true, color: fgText(C.headerFg) };
const BOLD_FONT = { ...BASE_FONT, bold: true };

/** Apply standard header row styling */
function styleHeaderRow(row) {
  row.height = 24;
  row.eachCell(cell => {
    cell.font = HEADER_FONT;
    cell.fill = bgFill(C.headerBg);
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });
}

/** Apply alternating row fill */
function styleDataRow(row, rowIndex, fillMap = {}) {
  const isEven = rowIndex % 2 === 0;
  row.height = 18;
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const customFill = fillMap[colNumber];
    cell.fill = customFill || bgFill(isEven ? C.rowEven : C.rowOdd);
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle', wrapText: false };
    if (!cell.font) cell.font = BASE_FONT;
  });
}

/** Get fill colour for status values */
function statusFill(value) {
  const map = {
    'Open':         C.statusOpen,
    'In Progress':  C.statusInProgress,
    'Resolved':     C.statusResolved,
    'Verified':     C.statusVerified,
    'Closed':       C.statusClosed,
    'Reopened':     C.statusReopened,
    // Assets
    'Operational':  C.assetOperational,
    'Degraded':     C.assetDegraded,
    'Offline':      C.assetOffline,
    'Maintenance':  C.assetMaintenance,
    'Spare':        C.assetSpare,
    // RMA
    'Requested':    C.rmaRequested,
    'Approved':     C.rmaApproved,
    'Ordered':      C.rmaOrdered,
    'Dispatched':   C.rmaDispatched,
    'Received':     C.rmaReceived,
    'Installed':    C.rmaInstalled,
    'Rejected':     C.rmaRejected,
    // SLA
    'On Track':     C.slaOk,
    'Breached':     C.slaBreached,
    // Active
    'Active':       C.active,
    'Inactive':     C.inactive,
  };
  return map[value] ? bgFill(map[value]) : null;
}

function priorityFill(value) {
  const map = {
    'Critical': C.priorCritical,
    'High':     C.priorHigh,
    'Medium':   C.priorMedium,
    'Low':      C.priorLow,
  };
  return map[value] ? bgFill(map[value]) : null;
}

/** Add a summary box in rows 1–N above the data */
async function addSummaryBlock(ws, summaryLines, numCols) {
  const totalLines = summaryLines.length;
  for (let i = 0; i < totalLines; i++) {
    const row = ws.insertRow(i + 1, []);
    const cell = row.getCell(1);
    ws.mergeCells(i + 1, 1, i + 1, numCols);
    cell.value = summaryLines[i].text;
    cell.font = summaryLines[i].bold
      ? { name: 'Calibri', size: summaryLines[i].size || 11, bold: true, color: fgText(summaryLines[i].color || '1E293B') }
      : { name: 'Calibri', size: summaryLines[i].size || 10, color: fgText(summaryLines[i].color || '475569') };
    cell.fill = bgFill(summaryLines[i].bg || 'F8FAFC');
    cell.alignment = { vertical: 'middle', horizontal: summaryLines[i].align || 'left', indent: summaryLines[i].indent || 1 };
    row.height = summaryLines[i].height || 18;
  }
  return totalLines;
}

/** Initialise a fresh worksheet with frozen header and auto-filter */
function initSheet(wb, sheetName, columns) {
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  ws.columns = columns;
  return ws;
}

/** Send buffer from ExcelJS workbook */
export async function workbookToBuffer(wb) {
  return wb.xlsx.writeBuffer();
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLED EXCEL GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. TICKETS ────────────────────────────────────────────────────────────────
export async function buildTicketsExcel(tickets) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TicketOps';
  wb.created = new Date();

  const columns = [
    { header: 'Ticket #',    key: 'ticketNumber', width: 14 },
    { header: 'Title',       key: 'title',        width: 40 },
    { header: 'Status',      key: 'status',       width: 14 },
    { header: 'Priority',    key: 'priority',     width: 12 },
    { header: 'Category',    key: 'category',     width: 20 },
    { header: 'Site',        key: 'site',         width: 25 },
    { header: 'Asset',       key: 'asset',        width: 14 },
    { header: 'Created By',  key: 'createdBy',    width: 22 },
    { header: 'Assigned To', key: 'assignedTo',   width: 22 },
    { header: 'Created On',  key: 'createdOn',    width: 20 },
    { header: 'Resolved On', key: 'resolvedOn',   width: 20 },
    { header: 'SLA Status',  key: 'slaStatus',    width: 14 },
  ];

  const ws = initSheet(wb, 'Tickets Report', columns);

  // KPI summary block
  const total    = tickets.length;
  const resolved = tickets.filter(t => ['Resolved','Verified','Closed'].includes(t.status)).length;
  const breached = tickets.filter(t => t.isSLARestoreBreached).length;

  const summaryLines = [
    { text: '📋  TICKETOPS — TICKETS REPORT', bold: true, size: 13, bg: '1E3A5F', color: 'FFFFFF', align: 'center', height: 28 },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}   |   Total: ${total}   |   Resolved: ${resolved}   |   SLA Breached: ${breached}`, size: 10, bg: 'EFF6FF', color: '1E40AF', align: 'center', height: 20 },
    { text: '', bg: 'FFFFFF', height: 6 },
  ];
  await addSummaryBlock(ws, summaryLines, columns.length);

  // Header row (now row 4)
  styleHeaderRow(ws.getRow(4));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  // Data rows
  tickets.forEach((ticket, i) => {
    const row = ws.addRow({
      ticketNumber: ticket.ticketNumber,
      title:        ticket.title,
      status:       ticket.status,
      priority:     ticket.priority,
      category:     ticket.category,
      site:         ticket.siteId?.siteName || 'N/A',
      asset:        ticket.assetId?.assetCode || 'N/A',
      createdBy:    ticket.createdBy?.fullName || 'System',
      assignedTo:   ticket.assignedTo?.fullName || 'Unassigned',
      createdOn:    ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('en-IN') : '',
      resolvedOn:   ticket.resolvedOn ? new Date(ticket.resolvedOn).toLocaleString('en-IN') : '—',
      slaStatus:    ticket.isSLARestoreBreached ? 'Breached' : 'On Track',
    });

    const statusCol  = 3;
    const priorityCol = 4;
    const slaCol     = 12;

    const fillMap = {};
    fillMap[statusCol]   = statusFill(ticket.status);
    fillMap[priorityCol] = priorityFill(ticket.priority);
    fillMap[slaCol]      = statusFill(ticket.isSLARestoreBreached ? 'Breached' : 'On Track');

    styleDataRow(row, i, fillMap);
    // Bold ticket number
    row.getCell(1).font = BOLD_FONT;
  });

  return workbookToBuffer(wb);
}

// ── 2. EMPLOYEES ──────────────────────────────────────────────────────────────
export async function buildEmployeesExcel(employees, statsMap) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TicketOps';
  wb.created = new Date();

  const columns = [
    { header: 'Employee Name',    key: 'name',        width: 25 },
    { header: 'Email',            key: 'email',       width: 30 },
    { header: 'Username',         key: 'username',    width: 16 },
    { header: 'Role',             key: 'role',        width: 16 },
    { header: 'Designation',      key: 'designation', width: 20 },
    { header: 'Mobile',           key: 'mobile',      width: 15 },
    { header: 'Primary Site',     key: 'primarySite', width: 25 },
    { header: 'Assigned Sites',   key: 'sites',       width: 40 },
    { header: 'Status',           key: 'status',      width: 10 },
    { header: 'Last Login',       key: 'lastLogin',   width: 20 },
    { header: 'Open',             key: 'open',        width: 10 },
    { header: 'In Progress',      key: 'inProgress',  width: 13 },
    { header: 'Resolved',         key: 'resolved',    width: 12 },
    { header: 'Closed',           key: 'closed',      width: 10 },
    { header: 'Total Tickets',    key: 'total',       width: 14 },
  ];

  const ws = initSheet(wb, 'Employee Status', columns);

  const total  = employees.length;
  const active = employees.filter(e => e.isActive).length;

  const summaryLines = [
    { text: '👥  TICKETOPS — EMPLOYEE STATUS REPORT', bold: true, size: 13, bg: '1E3A5F', color: 'FFFFFF', align: 'center', height: 28 },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}   |   Total Employees: ${total}   |   Active: ${active}   |   Inactive: ${total - active}`, size: 10, bg: 'EFF6FF', color: '1E40AF', align: 'center', height: 20 },
    { text: '', bg: 'FFFFFF', height: 6 },
  ];
  await addSummaryBlock(ws, summaryLines, columns.length);

  styleHeaderRow(ws.getRow(4));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  let totOpen = 0, totIP = 0, totRes = 0, totClo = 0, totAll = 0;

  employees.forEach((emp, i) => {
    const s = statsMap[emp._id.toString()] || {};
    totOpen += s.Open || 0;
    totIP   += s.InProgress || 0;
    totRes  += s.Resolved || 0;
    totClo  += s.Closed || 0;
    totAll  += s.Total || 0;

    const row = ws.addRow({
      name:        emp.fullName,
      email:       emp.email,
      username:    emp.username,
      role:        emp.role,
      designation: emp.designation || 'N/A',
      mobile:      emp.mobileNumber || 'N/A',
      primarySite: emp.siteId?.siteName || 'Not Assigned',
      sites:       emp.assignedSites?.map(s => s.siteName).join(', ') || 'None',
      status:      emp.isActive ? 'Active' : 'Inactive',
      lastLogin:   emp.lastLoginOn ? new Date(emp.lastLoginOn).toLocaleString('en-IN') : 'Never',
      open:        s.Open || 0,
      inProgress:  s.InProgress || 0,
      resolved:    s.Resolved || 0,
      closed:      s.Closed || 0,
      total:       s.Total || 0,
    });

    const fillMap = {};
    fillMap[9] = statusFill(emp.isActive ? 'Active' : 'Inactive');
    // Highlight high workload
    if ((s.Total || 0) >= 20) fillMap[15] = bgFill(C.priorHigh);
    styleDataRow(row, i, fillMap);
    row.getCell(1).font = BOLD_FONT;
  });

  // Totals row
  const totRow = ws.addRow({ name: 'TOTALS', open: totOpen, inProgress: totIP, resolved: totRes, closed: totClo, total: totAll });
  totRow.eachCell({ includeEmpty: true }, cell => {
    cell.fill = bgFill(C.totals);
    cell.font = BOLD_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle' };
  });

  return workbookToBuffer(wb);
}

// ── 3. ASSETS ─────────────────────────────────────────────────────────────────
export async function buildAssetsExcel(assets, rmaMap) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TicketOps';
  wb.created = new Date();

  const columns = [
    { header: 'Asset Code',         key: 'assetCode',   width: 15 },
    { header: 'Asset Type',          key: 'assetType',   width: 16 },
    { header: 'Device Type',         key: 'deviceType',  width: 20 },
    { header: 'Status',              key: 'status',      width: 14 },
    { header: 'Make',                key: 'make',        width: 18 },
    { header: 'Model',               key: 'model',       width: 18 },
    { header: 'Serial Number',       key: 'serial',      width: 22 },
    { header: 'IP Address',          key: 'ip',          width: 16 },
    { header: 'MAC Address',         key: 'mac',         width: 20 },
    { header: 'Site',                key: 'site',        width: 25 },
    { header: 'Site Code',           key: 'siteCode',    width: 12 },
    { header: 'City',                key: 'city',        width: 15 },
    { header: 'Location',            key: 'location',    width: 22 },
    { header: 'Criticality',         key: 'criticality', width: 12 },
    { header: 'VMS Ref ID',          key: 'vmsRef',      width: 15 },
    { header: 'NMS Ref ID',          key: 'nmsRef',      width: 15 },
    { header: 'Install Date',        key: 'installDate', width: 16 },
    { header: 'Warranty End',        key: 'warrantyEnd', width: 16 },
    { header: 'RMA Count',           key: 'rmaCount',    width: 12 },
    { header: 'Last RMA Date',       key: 'lastRma',     width: 16 },
    { header: 'Created On',          key: 'createdOn',   width: 16 },
    { header: 'Last Updated',        key: 'updatedOn',   width: 16 },
  ];

  const ws = initSheet(wb, 'Asset Status', columns);

  const total       = assets.length;
  const operational = assets.filter(a => a.status === 'Operational').length;
  const offline     = assets.filter(a => a.status === 'Offline').length;

  const summaryLines = [
    { text: '🖥️  TICKETOPS — ASSET STATUS REPORT', bold: true, size: 13, bg: '1E3A5F', color: 'FFFFFF', align: 'center', height: 28 },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}   |   Total: ${total}   |   Operational: ${operational}   |   Offline: ${offline}`, size: 10, bg: 'EFF6FF', color: '1E40AF', align: 'center', height: 20 },
    { text: '', bg: 'FFFFFF', height: 6 },
  ];
  await addSummaryBlock(ws, summaryLines, columns.length);

  styleHeaderRow(ws.getRow(4));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  assets.forEach((asset, i) => {
    const rma = rmaMap[asset._id.toString()] || {};
    const row = ws.addRow({
      assetCode:   asset.assetCode,
      assetType:   asset.assetType,
      deviceType:  asset.deviceType || 'N/A',
      status:      asset.status,
      make:        asset.make || 'N/A',
      model:       asset.model || 'N/A',
      serial:      asset.serialNumber || 'N/A',
      ip:          asset.ipAddress || 'N/A',
      mac:         asset.mac || 'N/A',
      site:        asset.siteId?.siteName || 'N/A',
      siteCode:    asset.siteId?.siteCode || 'N/A',
      city:        asset.siteId?.city || 'N/A',
      location:    asset.locationName || 'N/A',
      criticality: asset.criticality ?? 2,
      vmsRef:      asset.vmsReferenceId || 'N/A',
      nmsRef:      asset.nmsReferenceId || 'N/A',
      installDate: asset.installationDate ? new Date(asset.installationDate).toLocaleDateString('en-IN') : 'N/A',
      warrantyEnd: asset.warrantyEndDate  ? new Date(asset.warrantyEndDate).toLocaleDateString('en-IN')  : 'N/A',
      rmaCount:    rma.rmaCount || 0,
      lastRma:     rma.lastRmaDate ? new Date(rma.lastRmaDate).toLocaleDateString('en-IN') : 'N/A',
      createdOn:   asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('en-IN') : 'N/A',
      updatedOn:   asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString('en-IN') : 'N/A',
    });

    const fillMap = {};
    fillMap[4] = statusFill(asset.status);
    // Flag high RMA counts
    if ((rma.rmaCount || 0) >= 3) fillMap[19] = bgFill(C.priorHigh);
    styleDataRow(row, i, fillMap);
    row.getCell(1).font = BOLD_FONT;
  });

  return workbookToBuffer(wb);
}

// ── 4. RMA ────────────────────────────────────────────────────────────────────
export async function buildRMAExcel(rmaRequests) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TicketOps';
  wb.created = new Date();

  const columns = [
    { header: 'RMA ID',          key: 'rmaId',       width: 14 },
    { header: 'Ticket #',        key: 'ticketNo',    width: 14 },
    { header: 'Asset Code',      key: 'assetCode',   width: 15 },
    { header: 'Device Type',     key: 'deviceType',  width: 20 },
    { header: 'Status',          key: 'status',      width: 14 },
    { header: 'Site',            key: 'site',        width: 25 },
    { header: 'City',            key: 'city',        width: 15 },
    { header: 'Requested By',    key: 'requestedBy', width: 22 },
    { header: 'Requested Date',  key: 'requestedDate', width: 18 },
    { header: 'Approved By',     key: 'approvedBy',  width: 22 },
    { header: 'Vendor',          key: 'vendor',      width: 22 },
    { header: 'Installed Date',  key: 'installedDate', width: 18 },
    { header: 'Remarks',         key: 'remarks',     width: 35 },
  ];

  const ws = initSheet(wb, 'RMA Report', columns);

  const total     = rmaRequests.length;
  const pending   = rmaRequests.filter(r => ['Requested','Approved','Ordered','Dispatched'].includes(r.status)).length;
  const completed = rmaRequests.filter(r => r.status === 'Installed').length;

  const summaryLines = [
    { text: '🔄  TICKETOPS — RMA REPORT', bold: true, size: 13, bg: '1E3A5F', color: 'FFFFFF', align: 'center', height: 28 },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}   |   Total: ${total}   |   Pending: ${pending}   |   Completed: ${completed}`, size: 10, bg: 'EFF6FF', color: '1E40AF', align: 'center', height: 20 },
    { text: '', bg: 'FFFFFF', height: 6 },
  ];
  await addSummaryBlock(ws, summaryLines, columns.length);

  styleHeaderRow(ws.getRow(4));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  const getInstalledDate = (rma) => {
    const tl = rma.timeline?.find(t => t.status === 'Installed');
    return tl?.changedOn || rma.installedOn || null;
  };

  rmaRequests.forEach((rma, i) => {
    const row = ws.addRow({
      rmaId:         rma._id.toString().slice(-8).toUpperCase(),
      ticketNo:      rma.ticketId?.ticketNumber || '—',
      assetCode:     rma.originalAssetId?.assetCode || '—',
      deviceType:    rma.originalAssetId?.deviceType || '—',
      status:        rma.status,
      site:          rma.siteId?.siteName || '—',
      city:          rma.siteId?.city || '—',
      requestedBy:   rma.requestedBy?.fullName || '—',
      requestedDate: rma.createdAt ? new Date(rma.createdAt).toLocaleDateString('en-IN') : '—',
      approvedBy:    rma.approvedBy?.fullName || '—',
      vendor:        rma.vendorDetails?.vendorName || '—',
      installedDate: getInstalledDate(rma) ? new Date(getInstalledDate(rma)).toLocaleDateString('en-IN') : '—',
      remarks:       rma.remarks || '—',
    });

    const fillMap = {};
    fillMap[5] = statusFill(rma.status);
    styleDataRow(row, i, fillMap);
    row.getCell(1).font = BOLD_FONT;
  });

  return workbookToBuffer(wb);
}

// ── 5. SPARE STOCK ────────────────────────────────────────────────────────────
export async function buildSpareStockExcel(assets) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TicketOps';
  wb.created = new Date();

  const columns = [
    { header: 'Asset Code',   key: 'assetCode',   width: 16 },
    { header: 'Asset Type',   key: 'assetType',   width: 16 },
    { header: 'Device Type',  key: 'deviceType',  width: 22 },
    { header: 'Make',         key: 'make',        width: 18 },
    { header: 'Model',        key: 'model',       width: 18 },
    { header: 'Serial #',     key: 'serial',      width: 22 },
    { header: 'IP Address',   key: 'ip',          width: 16 },
    { header: 'MAC Address',  key: 'mac',         width: 20 },
    { header: 'Site',         key: 'site',        width: 25 },
    { header: 'Site Code',    key: 'siteCode',    width: 12 },
    { header: 'City',         key: 'city',        width: 15 },
  ];

  const ws = initSheet(wb, 'Spare Stock', columns);

  const total = assets.length;
  const summaryLines = [
    { text: '📦  TICKETOPS — SPARE STOCK REPORT', bold: true, size: 13, bg: '1E3A5F', color: 'FFFFFF', align: 'center', height: 28 },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}   |   Total Spare Items: ${total}`, size: 10, bg: 'EFF6FF', color: '1E40AF', align: 'center', height: 20 },
    { text: '', bg: 'FFFFFF', height: 6 },
  ];
  await addSummaryBlock(ws, summaryLines, columns.length);

  styleHeaderRow(ws.getRow(4));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  assets.forEach((asset, i) => {
    const row = ws.addRow({
      assetCode:  asset.assetCode,
      assetType:  asset.assetType,
      deviceType: asset.deviceType || 'N/A',
      make:       asset.make || 'N/A',
      model:      asset.model || 'N/A',
      serial:     asset.serialNumber || 'N/A',
      ip:         asset.ipAddress || 'N/A',
      mac:        asset.mac || 'N/A',
      site:       asset.siteId?.siteName || 'N/A',
      siteCode:   asset.siteId?.siteCode || 'N/A',
      city:       asset.siteId?.city || 'N/A',
    });
    styleDataRow(row, i, {});
    row.getCell(1).font = BOLD_FONT;
  });

  return workbookToBuffer(wb);
}

// ── 6. WORK ACTIVITY ──────────────────────────────────────────────────────────
export async function buildWorkActivityExcel(logs) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TicketOps';
  wb.created = new Date();

  const columns = [
    { header: 'Date',         key: 'date',        width: 14 },
    { header: 'Employee',     key: 'employee',    width: 24 },
    { header: 'Role',         key: 'role',        width: 16 },
    { header: 'Category',     key: 'category',    width: 20 },
    { header: 'Type',         key: 'type',        width: 12 },
    { header: 'Ticket #',     key: 'ticketRef',   width: 14 },
    { header: 'Site',         key: 'site',        width: 24 },
    { header: 'Description',  key: 'description', width: 50 },
    { header: 'Duration',     key: 'duration',    width: 12 },
    { header: 'Time',         key: 'time',        width: 14 },
  ];

  const ws = initSheet(wb, 'Work Activity', columns);

  let totalActivities = 0;
  logs.forEach(l => { totalActivities += (l.activities || []).length; });

  const summaryLines = [
    { text: '⚙️  TICKETOPS — WORK ACTIVITY REPORT', bold: true, size: 13, bg: '1E3A5F', color: 'FFFFFF', align: 'center', height: 28 },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}   |   Log Entries: ${logs.length}   |   Total Activities: ${totalActivities}`, size: 10, bg: 'EFF6FF', color: '1E40AF', align: 'center', height: 20 },
    { text: '', bg: 'FFFFFF', height: 6 },
  ];
  await addSummaryBlock(ws, summaryLines, columns.length);

  styleHeaderRow(ws.getRow(4));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  let rowIdx = 0;
  logs.forEach(log => {
    const user    = log.userId || {};
    const dateStr = log.date ? new Date(log.date).toLocaleDateString('en-IN') : '—';

    (log.activities || []).forEach(act => {
      const row = ws.addRow({
        date:        dateStr,
        employee:    user.fullName || 'Unknown',
        role:        user.role || '—',
        category:    act.category || '—',
        type:        act.type === 'auto' ? 'Automated' : 'Manual',
        ticketRef:   act.ticketRef?.ticketNumber || '—',
        site:        act.siteId?.siteName || '—',
        description: (act.description || '').slice(0, 200),
        duration:    act.duration ? `${act.duration} mins` : '—',
        time:        act.timestamp ? new Date(act.timestamp).toLocaleTimeString('en-IN') : '—',
      });

      const fillMap = {};
      if (act.type === 'auto') fillMap[5] = bgFill('EDE9FE');
      styleDataRow(row, rowIdx, fillMap);
      row.getCell(2).font = BOLD_FONT;
      rowIdx++;
    });
  });

  return workbookToBuffer(wb);
}

// ── 7. STOCK SUMMARY ─────────────────────────────────────────────────────────
export async function buildStockSummaryExcel(summaryRows, siteLabel) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TicketOps';
  wb.created = new Date();

  const columns = [
    { header: 'Device Type',  key: 'deviceType', width: 28 },
    { header: 'Make',         key: 'make',       width: 22 },
    { header: 'Model',        key: 'model',      width: 24 },
    { header: 'Quantity',     key: 'quantity',    width: 14 },
  ];

  const ws = initSheet(wb, 'Stock Summary', columns);

  const totalQty = summaryRows.reduce((s, r) => s + r.quantity, 0);
  const uniqueDeviceTypes = [...new Set(summaryRows.map(r => r.deviceType))].length;

  const summaryLines = [
    { text: '📦  TICKETOPS — INVENTORY STOCK SUMMARY', bold: true, size: 13, bg: '1E3A5F', color: 'FFFFFF', align: 'center', height: 28 },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}   |   Site: ${siteLabel}   |   ${uniqueDeviceTypes} Device Types   |   Total Qty: ${totalQty}`, size: 10, bg: 'EFF6FF', color: '1E40AF', align: 'center', height: 20 },
    { text: '', bg: 'FFFFFF', height: 6 },
  ];
  await addSummaryBlock(ws, summaryLines, columns.length);

  styleHeaderRow(ws.getRow(4));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  let prevDeviceType = '';
  summaryRows.forEach((item, i) => {
    const row = ws.addRow({
      deviceType: item.deviceType,
      make:       item.make,
      model:      item.model,
      quantity:   item.quantity,
    });

    const fillMap = {};
    if (item.deviceType !== prevDeviceType) {
      row.getCell(1).font = BOLD_FONT;
      prevDeviceType = item.deviceType;
    }
    if (item.quantity >= 20) fillMap[4] = bgFill(C.priorHigh);
    else if (item.quantity >= 10) fillMap[4] = bgFill(C.priorMedium);
    styleDataRow(row, i, fillMap);
  });

  const totRow = ws.addRow({ deviceType: 'TOTAL', quantity: totalQty });
  totRow.eachCell({ includeEmpty: true }, cell => {
    cell.fill = bgFill(C.totals);
    cell.font = BOLD_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle' };
  });

  return workbookToBuffer(wb);
}

// ── 8. USER ACTIVITIES ────────────────────────────────────────────────────────
export async function buildUserActivitiesExcel(activities) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TicketOps';
  wb.created = new Date();

  const columns = [
    { header: 'Date',           key: 'date',         width: 14 },
    { header: 'Time',           key: 'time',         width: 12 },
    { header: 'User',           key: 'user',         width: 24 },
    { header: 'Role',           key: 'role',         width: 16 },
    { header: 'Ticket #',       key: 'ticketNo',     width: 14 },
    { header: 'Ticket Title',   key: 'ticketTitle',  width: 40 },
    { header: 'Category',       key: 'category',     width: 20 },
    { header: 'Priority',       key: 'priority',     width: 12 },
    { header: 'Ticket Status',  key: 'ticketStatus', width: 14 },
    { header: 'Activity Type',  key: 'activityType', width: 20 },
    { header: 'Content',        key: 'content',      width: 50 },
    { header: 'Internal',       key: 'internal',     width: 10 },
  ];

  const ws = initSheet(wb, 'User Activities', columns);

  const total = activities.length;
  const summaryLines = [
    { text: '📝  TICKETOPS — USER ACTIVITIES REPORT', bold: true, size: 13, bg: '1E3A5F', color: 'FFFFFF', align: 'center', height: 28 },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}   |   Total Activities: ${total}`, size: 10, bg: 'EFF6FF', color: '1E40AF', align: 'center', height: 20 },
    { text: '', bg: 'FFFFFF', height: 6 },
  ];
  await addSummaryBlock(ws, summaryLines, columns.length);

  styleHeaderRow(ws.getRow(4));
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  activities.forEach((act, i) => {
    const row = ws.addRow({
      date:         act.createdOn ? new Date(act.createdOn).toLocaleDateString('en-IN') : '—',
      time:         act.createdOn ? new Date(act.createdOn).toLocaleTimeString('en-IN') : '—',
      user:         act.userId?.fullName || 'Unknown',
      role:         act.userId?.role || '—',
      ticketNo:     act.ticketId?.ticketNumber || '—',
      ticketTitle:  (act.ticketId?.title || '').slice(0, 100),
      category:     act.ticketId?.category || '—',
      priority:     act.ticketId?.priority || '—',
      ticketStatus: act.ticketId?.status || '—',
      activityType: act.activityType,
      content:      (act.content || '').slice(0, 200),
      internal:     act.isInternal ? 'Yes' : 'No',
    });

    const fillMap = {};
    fillMap[8]  = priorityFill(act.ticketId?.priority);
    fillMap[9]  = statusFill(act.ticketId?.status);
    if (act.isInternal) fillMap[12] = bgFill('FEF3C7');
    styleDataRow(row, i, fillMap);
    row.getCell(3).font = BOLD_FONT;
  });

  return workbookToBuffer(wb);
}
