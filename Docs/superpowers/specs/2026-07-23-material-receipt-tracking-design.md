# Material Receipt Tracking + Downloadable Summary Report

## Problem

Materials for a Field Ops project are dispatched from Head Office and received
at the project site, but the system has no way to record what actually
arrived. Today, `ProjectStockAllocation.allocatedQty` only tracks what's been
allocated to the project (the "PO quantity"), and `installedQty` only tracks
what's been physically installed at site (via `DeviceInstallation` records).
There's a gap in between: nothing captures that a shipment landed at site,
how much of it arrived, whether extra units came along, when it arrived, how
it was transported, and any remarks about the delivery (shortages, damage,
etc).

The user needs a downloadable summary report per project with columns:
`SL NO | Material Description | Material Qty in PO | UOM | Received Qty | UOM
| Extra Qty | Received Date | Mode of Transport | Remarks`.

## Goals

- Let someone at the project site (or Admin/Supervisor) log a material
  receipt: qty received, extra qty (beyond PO), received date, mode of
  transport, remarks.
- Support multiple receipt events per material over time (partial shipments),
  aggregating to running totals.
- Produce a downloadable `.xlsx` summary report, one row per material type,
  matching the exact column set above.

## Non-Goals

- A per-shipment audit UI (browsing individual receipt events) — the data is
  captured and retained (`receiptLog`) for future use, but no dedicated
  screen to browse it is built now.
- Changing what "Installed" means or how `DeviceInstallation`/`installedQty`
  work — receiving and installing remain distinct milestones.
- `AllocatedStockTab.jsx` — this component exists in the codebase but isn't
  imported/used anywhere; left untouched.

## Data Model

Extend `ProjectStockAllocation.model.js` (no new model — this is already the
per-project-per-material record holding `allocatedQty`, which doubles as
"Material Qty in PO"):

```js
receivedQty:          { type: Number, default: 0, min: 0 },
extraQty:             { type: Number, default: 0, min: 0 },
lastReceivedDate:     { type: Date },
lastModeOfTransport:  { type: String, maxlength: 100 },
lastReceiptRemarks:   { type: String, maxlength: 500 },
receiptLog: [{
  recordedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedAt:      { type: Date, default: Date.now },
  receivedQty:     Number,
  extraQty:        Number,
  receivedDate:    Date,
  modeOfTransport: String,
  remarks:         String
}]
```

This mirrors the existing `changeLog` array already on this model (used for
`allocatedQty` audit trail on admin adjustments) — same shape, new purpose.
`receivedQty`/`extraQty` are running totals updated cumulatively each time a
receipt is logged; `lastReceivedDate`/`lastModeOfTransport`/
`lastReceiptRemarks` always reflect the most recent entry, which is what the
aggregated report shows in those columns.

UOM needs no new field — reused from the existing `Asset.unit` field
(populated today as `stockItemId.unit` on every allocation query, defaulting
to `'Nos'`).

## Backend Changes

### 1. Log a receipt — `POST /api/stock/allocations/:id/receive`

New controller function in `stock.controller.js`, alongside `updateAllocation`.

Body: `{ receivedQty, extraQty, receivedDate, modeOfTransport, remarks }`.

Behavior:
- Load the allocation by `:id`, 404 if not found.
- Validate `receivedQty >= 0` and `extraQty >= 0` (allow 0 for either — a
  receipt might be pure extra with 0 against PO, or vice versa).
- Push a `receiptLog` entry with `recordedBy: req.user._id`.
- Increment running totals: `allocation.receivedQty += receivedQty`,
  `allocation.extraQty += extraQty`.
- Set `lastReceivedDate`, `lastModeOfTransport`, `lastReceiptRemarks` to the
  values just submitted (always the latest, regardless of `receivedDate`
  order — if someone back-logs an older receipt after a newer one, the
  "last" fields still reflect the most recently *logged* entry, not
  necessarily the most recent *receivedDate*; this matches how `changeLog`
  already behaves for `allocatedQty`).
- Save and return the populated allocation (same populate shape as
  `updateAllocation`'s response).

Permission: `protect` + a check allowing Admin, Supervisor, or the project's
assigned PM/team members — reusing the existing `canAccessProject` /
`isAssignedPM` pattern already used for device-installation and challenge
actions in `fieldops.controller.js`. (`stock.controller.js` will need to
import `Project` and that access-check helper, or duplicate the small
inline check — following whichever existing import pattern is cleaner at
implementation time.)

Mount in `stock.routes.js` next to the existing allocation routes:
```js
router.post('/allocations/:id/receive', logMaterialReceipt);
```

### 2. Export the report — `GET /api/fieldops/projects/:projectId/material-receipt-report`

New controller function in `fieldops.controller.js` (distinct from the
existing unimplemented `exportProjectReportExcel` stub — not reusing that
name, since its original scope is unclear/unrelated).

Behavior:
- Validate project exists and `canAccessProject`.
- `ProjectStockAllocation.find({ projectId }).populate('stockItemId', 'assetType deviceType make model unit')`.
- Map to rows in the exact column order requested:
  ```js
  rows = allocations.map((a, i) => ({
    'SL NO': i + 1,
    'Material Description': [a.stockItemId?.deviceType, a.stockItemId?.make, a.stockItemId?.model].filter(Boolean).join(' - ') || a.stockItemId?.assetType || 'Unknown',
    'Material Qty in PO': a.allocatedQty || 0,
    'UOM': a.stockItemId?.unit || 'Nos',
    'Received Qty': a.receivedQty || 0,
    'UOM ': a.stockItemId?.unit || 'Nos',   // trailing space to keep the duplicate header distinct in the sheet
    'Extra Qty': a.extraQty || 0,
    'Received Date': a.lastReceivedDate ? format(a.lastReceivedDate, 'dd MMM yyyy') : '',
    'Mode of Transport': a.lastModeOfTransport || '',
    'Remarks': a.lastReceiptRemarks || ''
  }));
  ```
- `XLSX.utils.json_to_sheet(rows)` → `XLSX.utils.book_new()` →
  `XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })` → send as
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with
  `Content-Disposition: attachment; filename="material_receipt_<projectNumber>.xlsx"`.
  This is the exact pattern `exportSelectedAssets` already uses in
  `stock.controller.js` — `xlsx` is already a backend dependency, no new
  library.

Mount in `fieldops.routes.js`:
```js
router.get('/projects/:projectId/material-receipt-report', exportMaterialReceiptReport);
```

## Frontend Changes (`ProjectAllocatedStockList.jsx`)

- New "Received" column in the existing table, between "Allocated" and
  "Installed" (or after Installed — final placement decided at
  implementation time to read naturally left-to-right as the material's
  lifecycle: Allocated → Received → Installed → Faulty → Remaining).
- New "Log Receipt" button per row (small icon button, same treatment as
  other row actions elsewhere in the app) opening a modal — reusing the
  established `.modal-overlay` / `.modal-content` / `.modal-header` /
  `.modal-body` / `.modal-footer` pattern (same one used for the Resolve
  Challenge modal built earlier). Fields: Received Qty (number), Extra Qty
  (number, default 0), Received Date (date, default today), Mode of
  Transport (text or a small fixed dropdown — Road/Air/Courier/Other),
  Remarks (textarea). Submits to the new `/receive` endpoint, then refetches
  allocations.
- New "Download Report" button in the page header, calling
  `stockApi` (or a new `fieldOpsApi.exportMaterialReceiptReport(projectId)`)
  with `responseType: 'blob'`, then triggering the download via the existing
  `downloadXlsxBlob`-style helper pattern already used in `AssetsList.jsx`
  (inline `Blob` + `URL.createObjectURL` + synthetic `<a download>` click —
  no new dependency).

### API additions (`services/api.js`)

```js
// stockApi
logAllocationReceipt: (id, data) => api.post(`/stock/allocations/${id}/receive`, data),

// fieldOpsApi
exportMaterialReceiptReport: (projectId) =>
  api.get(`/fieldops/projects/${projectId}/material-receipt-report`, { responseType: 'blob' }),
```

## Error Handling

- `/receive` endpoint: reject negative quantities (400), 404 if allocation
  not found, 403 if the user isn't Admin/Supervisor/assigned PM/team member.
  No upper-bound validation on `receivedQty` against `allocatedQty` —
  over-receipt (more arrived than the PO'd amount) is a real scenario the
  `extraQty` field exists to capture, so this is not an error condition.
- Report export: if the project has zero allocations, still generate a
  valid (empty-body) `.xlsx` with headers rather than erroring, so the
  download always succeeds.

## Testing

- Manual: log a receipt on an allocation, verify `receivedQty`/`extraQty`
  increment and the table's "Received" column updates.
- Manual: log a second partial receipt on the same allocation, verify totals
  accumulate correctly and `lastReceivedDate`/`lastModeOfTransport` reflect
  the second entry, not the first.
- Manual: download the report, open in Excel, verify column headers and
  values match the requested format exactly, including both UOM columns.
- Manual: attempt to log a receipt as a user with no project access, verify
  403.
