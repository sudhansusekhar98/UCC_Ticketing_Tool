# Material Receipt Tracking + Downloadable Summary Report — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let someone at a project site log material receipts (qty received, extra qty, date, transport mode, remarks) against existing `ProjectStockAllocation` records, and let anyone with project access download a per-project `.xlsx` summary matching the requested PO/Received/Extra Qty column format.

**Architecture:** Extend `ProjectStockAllocation.model.js` with receipt-tracking fields (mirroring its existing `changeLog` pattern). Add one mutating endpoint (`POST /api/stock/allocations/:id/receive`) in `stock.controller.js` and one export endpoint (`GET /api/fieldops/projects/:projectId/material-receipt-report`) in `fieldops.controller.js`, reusing the `xlsx` package exactly as `exportSelectedAssets` already does. Frontend: a "Log Receipt" modal and "Download Report" button added to `ProjectAllocatedStockList.jsx`.

**Tech Stack:** Express + Mongoose (backend), `xlsx` npm package (already a backend dependency), React 19 + axios (frontend), Jest with `jest.unstable_mockModule` for backend unit tests (existing convention, see `backend-express/__tests__/fieldops/fieldops.controller.test.js`).

## Global Constraints

- No new npm dependencies — `xlsx` is already installed and used elsewhere (`backend-express/controllers/stock.controller.js`'s `exportSelectedAssets`).
- Follow the existing backend test convention exactly: `jest.unstable_mockModule` for model imports, dynamic `import()` of the controller after mocks are registered, `mockReq`/`mockRes`/`mockNext`/`chainableMock`/`objectId` helpers from `backend-express/__tests__/helpers.js`. Do not introduce a different mocking library.
- Backend controllers in this codebase never import from other controllers (verified: no `from '../controllers/` references anywhere). The small access-check logic needed in `stock.controller.js` must be a local, self-contained function — do not import `canAccessProject` from `fieldops.controller.js`.
- The frontend has no unit test framework configured — frontend task verification is `npm run lint` plus manual checks in the running dev server, same as the sibling plan.
- UOM reuses the existing `Asset.unit` field (already populated on every allocation query, default `'Nos'`) — no new UOM field.
- Reference spec: `docs/superpowers/specs/2026-07-23-material-receipt-tracking-design.md`.

---

### Task 1: Extend `ProjectStockAllocation` schema with receipt-tracking fields

**Files:**
- Modify: `backend-express/models/ProjectStockAllocation.model.js`

**Interfaces:**
- Produces: new schema fields `receivedQty`, `extraQty`, `lastReceivedDate`, `lastModeOfTransport`, `lastReceiptRemarks`, `receiptLog[]` — consumed by Task 2 (`logMaterialReceipt`) and Task 3 (`exportMaterialReceiptReport`).

- [ ] **Step 1: Add the new fields to the schema**

The current schema (`backend-express/models/ProjectStockAllocation.model.js`) has `notes` and `changeLog` as its last two fields before the closing `}, { timestamps: true, ... })`:

```js
  notes: {
    type: String,
    maxlength: 500,
    trim: true
  },
  changeLog: [{
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeDate: {
      type: Date,
      default: Date.now
    },
    previousQty: Number,
    newQty: Number,
    reason: {
      type: String,
      maxlength: 500
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
```

Insert new fields immediately after `changeLog` and before the closing `}, {`:

```js
  notes: {
    type: String,
    maxlength: 500,
    trim: true
  },
  changeLog: [{
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeDate: {
      type: Date,
      default: Date.now
    },
    previousQty: Number,
    newQty: Number,
    reason: {
      type: String,
      maxlength: 500
    }
  }],
  // Material receipt tracking (goods dispatched from Head Office, received at site)
  receivedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  extraQty: {
    type: Number,
    default: 0,
    min: 0
  },
  lastReceivedDate: {
    type: Date
  },
  lastModeOfTransport: {
    type: String,
    maxlength: 100,
    trim: true
  },
  lastReceiptRemarks: {
    type: String,
    maxlength: 500,
    trim: true
  },
  receiptLog: [{
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    recordedAt: {
      type: Date,
      default: Date.now
    },
    receivedQty: Number,
    extraQty: Number,
    receivedDate: Date,
    modeOfTransport: {
      type: String,
      maxlength: 100
    },
    remarks: {
      type: String,
      maxlength: 500
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
```

- [ ] **Step 2: Sanity-check the model still loads**

Run: `cd backend-express && node -e "import('./models/ProjectStockAllocation.model.js').then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })"`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend-express/models/ProjectStockAllocation.model.js
git commit -m "feat(stock): add material receipt tracking fields to ProjectStockAllocation"
```

---

### Task 2: `POST /api/stock/allocations/:id/receive` — log a material receipt

**Files:**
- Modify: `backend-express/controllers/stock.controller.js`
- Modify: `backend-express/routes/stock.routes.js`
- Create: `backend-express/__tests__/stock/stock.controller.test.js`

**Interfaces:**
- Consumes: `ProjectStockAllocation.findById`, `Project.findById` (both already imported in `stock.controller.js`); schema fields from Task 1.
- Produces: exported `logMaterialReceipt` function, consumed by the route in this task and by Task 4's frontend `stockApi.logAllocationReceipt`.

- [ ] **Step 1: Write the failing test**

Create `backend-express/__tests__/stock/stock.controller.test.js`:

```js
/**
 * Stock Controller – logMaterialReceipt unit tests (ESM compatible)
 */
import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import { objectId, mockAdminUser, mockPMUser, mockReq, mockRes, mockNext } from '../helpers.js';

const mockProjectStockAllocationModel = {
  findById: jest.fn(),
};

const mockProjectModel = {
  findById: jest.fn(),
};

jest.unstable_mockModule('../../models/ProjectStockAllocation.model.js', () => ({
  default: mockProjectStockAllocationModel,
}));

jest.unstable_mockModule('../../models/Project.model.js', () => ({
  default: mockProjectModel,
}));

let controller;

beforeAll(async () => {
  controller = await import('../../controllers/stock.controller.js');
});

afterEach(() => jest.clearAllMocks());

const buildAllocation = (overrides = {}) => ({
  _id: objectId(),
  projectId: objectId(),
  receivedQty: 0,
  extraQty: 0,
  receiptLog: [],
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const chainablePopulate = (resolveValue) => {
  const chain = {
    then: (resolve) => Promise.resolve(resolveValue).then(resolve),
    catch: (reject) => Promise.resolve(resolveValue).catch(reject),
  };
  chain.populate = jest.fn(() => chain);
  return chain;
};

describe('logMaterialReceipt', () => {
  it('logs a receipt and updates running totals for an Admin user', async () => {
    const allocation = buildAllocation();
    const project = { _id: allocation.projectId, assignedPM: objectId(), teamMembers: [] };

    mockProjectStockAllocationModel.findById
      .mockResolvedValueOnce(allocation)
      .mockReturnValueOnce(chainablePopulate({ _id: allocation._id, receivedQty: 5 }));
    mockProjectModel.findById.mockResolvedValueOnce(project);

    const req = mockReq({
      user: mockAdminUser(),
      params: { id: allocation._id.toString() },
      body: { receivedQty: 5, extraQty: 1, receivedDate: '2026-07-20', modeOfTransport: 'Road', remarks: 'On time' }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(allocation.receivedQty).toBe(5);
    expect(allocation.extraQty).toBe(1);
    expect(allocation.lastModeOfTransport).toBe('Road');
    expect(allocation.receiptLog).toHaveLength(1);
    expect(allocation.save).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('rejects negative receivedQty with 400', async () => {
    const req = mockReq({
      user: mockAdminUser(),
      params: { id: objectId().toString() },
      body: { receivedQty: -1, extraQty: 0 }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(res.statusCode).toBe(400);
    expect(mockProjectStockAllocationModel.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when the allocation does not exist', async () => {
    mockProjectStockAllocationModel.findById.mockResolvedValueOnce(null);

    const req = mockReq({
      user: mockAdminUser(),
      params: { id: objectId().toString() },
      body: { receivedQty: 1, extraQty: 0 }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for a user with no project access', async () => {
    const allocation = buildAllocation();
    const project = { _id: allocation.projectId, assignedPM: objectId(), teamMembers: [] };
    const outsider = { _id: objectId(), role: 'L1Engineer', rights: { siteRights: [], globalRights: [] } };

    mockProjectStockAllocationModel.findById.mockResolvedValueOnce(allocation);
    mockProjectModel.findById.mockResolvedValueOnce(project);

    const req = mockReq({
      user: outsider,
      params: { id: allocation._id.toString() },
      body: { receivedQty: 1, extraQty: 0 }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(res.statusCode).toBe(403);
    expect(allocation.save).not.toHaveBeenCalled();
  });

  it('allows the assigned PM (project team member) to log a receipt', async () => {
    const pmUser = mockPMUser();
    const allocation = buildAllocation();
    const project = { _id: allocation.projectId, assignedPM: pmUser._id, teamMembers: [] };

    mockProjectStockAllocationModel.findById
      .mockResolvedValueOnce(allocation)
      .mockReturnValueOnce(chainablePopulate({ _id: allocation._id }));
    mockProjectModel.findById.mockResolvedValueOnce(project);

    const req = mockReq({
      user: pmUser,
      params: { id: allocation._id.toString() },
      body: { receivedQty: 2, extraQty: 0 }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(res.body.success).toBe(true);
    expect(allocation.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend-express && node --experimental-vm-modules ../node_modules/jest/bin/jest.js __tests__/stock/stock.controller.test.js --forceExit --detectOpenHandles`
Expected: FAIL — `controller.logMaterialReceipt is not a function`.

- [ ] **Step 3: Implement `logMaterialReceipt` in `stock.controller.js`**

Add this function after `updateAllocation` (which ends around line 1867, just before the `// @desc    Delete an allocation` comment):

```js
// @desc    Log a material receipt against a project stock allocation
// @route   POST /api/stock/allocations/:id/receive
// @access  Private (Admin, Supervisor, assigned PM/team members)
export const logMaterialReceipt = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { receivedQty = 0, extraQty = 0, receivedDate, modeOfTransport, remarks } = req.body;
    const user = req.user;

    if (receivedQty < 0 || extraQty < 0) {
        return res.status(400).json({ success: false, message: 'Received Qty and Extra Qty cannot be negative' });
    }

    const allocation = await ProjectStockAllocation.findById(id);
    if (!allocation) {
        return res.status(404).json({ success: false, message: 'Allocation not found' });
    }

    const project = await Project.findById(allocation.projectId);
    if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Local access check: Admin/Supervisor, or the project's assigned PM/team member.
    // (Controllers in this codebase don't import from each other, so this is kept
    // self-contained rather than reusing fieldops.controller.js's canAccessProject.)
    const isPrivileged = ['Admin', 'Supervisor'].includes(user.role);
    const isProjectMember = project.assignedPM?.toString() === user._id.toString() ||
        project.teamMembers?.some(tm => tm.toString() === user._id.toString());
    if (!isPrivileged && !isProjectMember) {
        return res.status(403).json({ success: false, message: 'Not authorized to log receipts for this project' });
    }

    allocation.receiptLog.push({
        recordedBy: user._id,
        receivedQty,
        extraQty,
        receivedDate: receivedDate || new Date(),
        modeOfTransport,
        remarks
    });
    allocation.receivedQty += receivedQty;
    allocation.extraQty += extraQty;
    allocation.lastReceivedDate = receivedDate || new Date();
    allocation.lastModeOfTransport = modeOfTransport;
    allocation.lastReceiptRemarks = remarks;

    await allocation.save();

    const populated = await ProjectStockAllocation.findById(allocation._id)
        .populate('stockItemId', 'assetType deviceType make model serialNumber quantity unit')
        .populate('allocatedBy', 'name');

    res.json({
        success: true,
        data: populated,
        message: 'Material receipt logged successfully'
    });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run the same command as Step 2.
Expected: PASS (5 tests).

- [ ] **Step 5: Mount the route**

In `backend-express/routes/stock.routes.js`, add `logMaterialReceipt` to the import list from `'../controllers/stock.controller.js'` (alongside `updateAllocation`), then add this line directly after the existing `router.put('/allocations/:id', adminOnly, updateAllocation);`:

```js
router.post('/allocations/:id/receive', logMaterialReceipt);
```

(No role-restricting middleware — access control is enforced inside the controller, matching how project-scoped access is already checked inline in `fieldops.controller.js`.)

- [ ] **Step 6: Run the full backend test suite**

Run: `cd backend-express && npm test`
Expected: all existing tests plus the 5 new ones pass.

- [ ] **Step 7: Commit**

```bash
git add backend-express/controllers/stock.controller.js backend-express/routes/stock.routes.js backend-express/__tests__/stock/stock.controller.test.js
git commit -m "feat(stock): add POST /api/stock/allocations/:id/receive endpoint"
```

---

### Task 3: `GET /api/fieldops/projects/:projectId/material-receipt-report` — Excel export

**Files:**
- Modify: `backend-express/controllers/fieldops.controller.js`
- Modify: `backend-express/routes/fieldops.routes.js`
- Modify: `backend-express/__tests__/fieldops/fieldops.controller.test.js`

**Interfaces:**
- Consumes: `Project.findById`, `ProjectStockAllocation.find` (both already imported in `fieldops.controller.js`), the local `canAccessProject` helper (already defined at the top of that file), schema fields from Task 1.
- Produces: exported `exportMaterialReceiptReport` function, consumed by the route in this task and by Task 4's frontend `fieldOpsApi.exportMaterialReceiptReport`.

- [ ] **Step 1: Make the `ProjectStockAllocation` mock controllable**

In `backend-express/__tests__/fieldops/fieldops.controller.test.js`, find:

```js
jest.unstable_mockModule('../../models/ProjectStockAllocation.model.js', () => ({
  default: { find: jest.fn() },
}));
```

Replace it with a named, hoisted mock so tests can control it. First add the declaration near the other `mock*Model` consts (right before the `mockChallengeLogModel` declaration or after it — anywhere in that declaration block):

```js
const mockProjectStockAllocationModel = {
  find: jest.fn(),
};
```

Then change the mock registration to:

```js
jest.unstable_mockModule('../../models/ProjectStockAllocation.model.js', () => ({
  default: mockProjectStockAllocationModel,
}));
```

- [ ] **Step 2: Write the failing test**

Append to the end of `backend-express/__tests__/fieldops/fieldops.controller.test.js` (after the last existing `describe` block):

```js
// ═══════════════════════════════════════════
//  12. exportMaterialReceiptReport
// ═══════════════════════════════════════════
describe('exportMaterialReceiptReport', () => {
  it('returns a 404 when the project does not exist', async () => {
    mockProjectModel.findById.mockResolvedValueOnce(null);

    const req = mockReq({ params: { projectId: objectId().toString() } });
    const res = mockRes();
    res.setHeader = jest.fn();
    res.send = jest.fn();

    await controller.exportMaterialReceiptReport(req, res, mockNext());

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 when the user cannot access the project', async () => {
    const project = mockProject({ isActive: true, teamMembers: [], assignedVendors: [] });
    mockProjectModel.findById.mockResolvedValueOnce(project);

    const outsider = { _id: objectId(), role: 'L1Engineer', rights: { siteRights: [], globalRights: [] } };
    const req = mockReq({ user: outsider, params: { projectId: project._id.toString() } });
    const res = mockRes();
    res.setHeader = jest.fn();
    res.send = jest.fn();

    await controller.exportMaterialReceiptReport(req, res, mockNext());

    expect(res.statusCode).toBe(403);
  });

  it('builds an xlsx buffer with one row per allocation for an authorized Admin', async () => {
    const project = mockProject({ isActive: true });
    mockProjectModel.findById.mockResolvedValueOnce(project);

    const allocations = [
      {
        allocatedQty: 20,
        receivedQty: 18,
        extraQty: 2,
        lastReceivedDate: new Date('2026-07-20'),
        lastModeOfTransport: 'Road',
        lastReceiptRemarks: '2 short-shipped, followed up',
        stockItemId: { assetType: 'Camera', deviceType: 'Dome Camera', make: 'Hikvision', model: 'DS-2', unit: 'Nos' }
      }
    ];
    mockProjectStockAllocationModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(allocations)
      })
    });

    const req = mockReq({ user: mockAdminUser(), params: { projectId: project._id.toString() } });
    const res = mockRes();
    res.setHeader = jest.fn();
    res.send = jest.fn();

    await controller.exportMaterialReceiptReport(req, res, mockNext());

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining(project.projectNumber)
    );
    expect(res.send).toHaveBeenCalled();
    const buffer = res.send.mock.calls[0][0];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend-express && npm test -- fieldops.controller.test.js`
Expected: FAIL — `controller.exportMaterialReceiptReport is not a function`.

- [ ] **Step 4: Implement `exportMaterialReceiptReport` in `fieldops.controller.js`**

Add `XLSX` to the top imports (it isn't imported in this file yet):

```js
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import Project, { ProjectStatuses } from '../models/Project.model.js';
```

Add the new function right after the existing `exportProjectReportExcel` stub (search for `export const exportProjectReportExcel`):

```js
/**
 * @desc    Export material receipt summary (PO qty vs received vs extra qty per material)
 * @route   GET /api/fieldops/projects/:projectId/material-receipt-report
 * @access  Private
 */
export const exportMaterialReceiptReport = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project || !project.isActive) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  if (!canAccessProject(req.user, project)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const allocations = await ProjectStockAllocation.find({ projectId })
    .populate('stockItemId', 'assetType deviceType make model unit')
    .lean();

  const rows = allocations.map((a, i) => ({
    'SL NO': i + 1,
    'Material Description': [a.stockItemId?.deviceType, a.stockItemId?.make, a.stockItemId?.model]
      .filter(Boolean).join(' - ') || a.stockItemId?.assetType || 'Unknown',
    'Material Qty in PO': a.allocatedQty || 0,
    'UOM': a.stockItemId?.unit || 'Nos',
    'Received Qty': a.receivedQty || 0,
    'UOM ': a.stockItemId?.unit || 'Nos',
    'Extra Qty': a.extraQty || 0,
    'Received Date': a.lastReceivedDate ? new Date(a.lastReceivedDate).toISOString().slice(0, 10) : '',
    'Mode of Transport': a.lastModeOfTransport || '',
    'Remarks': a.lastReceiptRemarks || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Material Receipt');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="material_receipt_${project.projectNumber}.xlsx"`);
  res.status(200).send(buffer);
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend-express && npm test -- fieldops.controller.test.js`
Expected: PASS (all tests in this file, including the 3 new ones).

- [ ] **Step 6: Mount the route**

In `backend-express/routes/fieldops.routes.js`, add `exportMaterialReceiptReport` to the existing import list from `'../controllers/fieldops.controller.js'` (it already imports `exportProjectReportExcel` — add the new name alongside it), then add this line in the `// ==================== REPORTS ====================` section, after the existing `router.get('/reports/project/:id/export/excel', ...)` block:

```js
// GET /api/fieldops/projects/:projectId/material-receipt-report - PO vs Received vs Extra qty summary
router.get('/projects/:projectId/material-receipt-report', exportMaterialReceiptReport);
```

(No `adminSupervisorOnly` middleware — same project-level access check used elsewhere in this file, enforced inside the controller via `canAccessProject`.)

- [ ] **Step 7: Run the full backend test suite**

Run: `cd backend-express && npm test`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend-express/controllers/fieldops.controller.js backend-express/routes/fieldops.routes.js backend-express/__tests__/fieldops/fieldops.controller.test.js
git commit -m "feat(fieldops): add material receipt xlsx export endpoint"
```

---

### Task 4: Frontend API wrappers

**Files:**
- Modify: `frontend/src/services/api.js`

**Interfaces:**
- Produces: `stockApi.logAllocationReceipt(id, data)` and `fieldOpsApi.exportMaterialReceiptReport(projectId)`, consumed by Task 5.

- [ ] **Step 1: Add `logAllocationReceipt` to `stockApi`**

Find this line in `frontend/src/services/api.js`:

```js
    updateAllocation: (id, data) => api.put(`/stock/allocations/${id}`, data),
```

Add immediately after it:

```js
    logAllocationReceipt: (id, data) => api.post(`/stock/allocations/${id}/receive`, data),
```

- [ ] **Step 2: Add `exportMaterialReceiptReport` to `fieldOpsApi`**

Find the `getProjectDashboard` line in `fieldOpsApi`:

```js
    getProjectDashboard: (id) => api.get(`/fieldops/projects/${id}/dashboard`),
```

Add immediately after it:

```js
    exportMaterialReceiptReport: (projectId) =>
        api.get(`/fieldops/projects/${projectId}/material-receipt-report`, { responseType: 'blob' }),
```

- [ ] **Step 3: Lint check**

Run: `cd frontend && npm run lint -- --no-fix src/services/api.js`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "feat(fieldops): add frontend API wrappers for material receipt tracking"
```

---

### Task 5: "Log Receipt" modal + "Received" column + "Download Report" button

**Files:**
- Modify: `frontend/src/pages/fieldops/ProjectAllocatedStockList.jsx`

**Interfaces:**
- Consumes: `stockApi.logAllocationReceipt` and `fieldOpsApi.exportMaterialReceiptReport` from Task 4.
- Produces: nothing further — terminal task for this plan.

- [ ] **Step 1: Add imports and modal state**

Change the top imports:

```js
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ChevronLeft,
    RefreshCw,
    Package,
    AlertCircle,
    Plus,
    Search
} from 'lucide-react';
import { fieldOpsApi, stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import './fieldops.css';
```

to:

```js
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ChevronLeft,
    RefreshCw,
    Package,
    AlertCircle,
    Plus,
    Search,
    Download,
    Truck
} from 'lucide-react';
import { fieldOpsApi, stockApi } from '../../services/api';
import toast from 'react-hot-toast';
import './fieldops.css';
```

Add new state right after the existing `deviceTypeFilter` state declaration:

```js
    const [receivingAlloc, setReceivingAlloc] = useState(null);
    const [receiptForm, setReceiptForm] = useState({ receivedQty: 0, extraQty: 0, receivedDate: '', modeOfTransport: '', remarks: '' });
    const [savingReceipt, setSavingReceipt] = useState(false);
    const [downloadingReport, setDownloadingReport] = useState(false);
```

- [ ] **Step 2: Add the receipt-logging and report-download handlers**

Add these functions after the existing `loadAllocations` function:

```js
    const openReceiptModal = (alloc) => {
        setReceivingAlloc(alloc);
        setReceiptForm({
            receivedQty: 0,
            extraQty: 0,
            receivedDate: new Date().toISOString().slice(0, 10),
            modeOfTransport: '',
            remarks: ''
        });
    };

    const closeReceiptModal = () => {
        setReceivingAlloc(null);
    };

    const handleLogReceipt = async () => {
        if (receiptForm.receivedQty <= 0 && receiptForm.extraQty <= 0) {
            toast.error('Enter a Received Qty or Extra Qty greater than 0');
            return;
        }

        setSavingReceipt(true);
        try {
            await stockApi.logAllocationReceipt(receivingAlloc._id, receiptForm);
            toast.success('Receipt logged successfully');
            closeReceiptModal();
            loadAllocations();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to log receipt');
        } finally {
            setSavingReceipt(false);
        }
    };

    const handleDownloadReport = async () => {
        setDownloadingReport(true);
        try {
            const res = await fieldOpsApi.exportMaterialReceiptReport(id);
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `material_receipt_${project?.projectNumber || id}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to download report');
        } finally {
            setDownloadingReport(false);
        }
    };
```

- [ ] **Step 3: Add the "Download Report" button to the page header**

Find the header actions block:

```jsx
                <div className="header-actions">
                    <button onClick={loadAllocations} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    <Link to="/stock" className="btn btn-ghost">
                        <Package size={18} /> View Inventory
                    </Link>
                </div>
```

Replace with:

```jsx
                <div className="header-actions">
                    <button onClick={loadAllocations} className="btn btn-ghost" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    <button onClick={handleDownloadReport} className="btn btn-primary" disabled={downloadingReport}>
                        <Download size={18} /> {downloadingReport ? 'Downloading...' : 'Download Report'}
                    </button>
                    <Link to="/stock" className="btn btn-ghost">
                        <Package size={18} /> View Inventory
                    </Link>
                </div>
```

- [ ] **Step 4: Add the "Received" column and "Log Receipt" action to the table**

Find the table header row:

```jsx
                                <tr>
                                    <th>Item</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Allocated</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Installed</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Faulty</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Remaining</th>
                                    <th style={{ textAlign: 'center', width: '140px', padding: '1rem' }}>Status</th>
                                </tr>
```

Replace with:

```jsx
                                <tr>
                                    <th>Item</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Allocated</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Received</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Installed</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Faulty</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Remaining</th>
                                    <th style={{ textAlign: 'center', width: '140px', padding: '1rem' }}>Status</th>
                                    <th style={{ textAlign: 'center', width: '100px', padding: '1rem' }}>Actions</th>
                                </tr>
```

Find the row-rendering code:

```jsx
                                        <td style={{ textAlign: 'center', fontWeight: 600, padding: '1rem' }}>
                                                {Math.round(alloc.allocatedQty || 0)}
                                            </td>
                                            <td style={{ textAlign: 'center', color: 'var(--success-400)', padding: '1rem' }}>
                                                {Math.round(alloc.installedQty || 0)}
                                            </td>
```

Replace with:

```jsx
                                        <td style={{ textAlign: 'center', fontWeight: 600, padding: '1rem' }}>
                                                {Math.round(alloc.allocatedQty || 0)}
                                            </td>
                                            <td style={{ textAlign: 'center', color: 'var(--primary-400)', padding: '1rem' }}>
                                                {Math.round(alloc.receivedQty || 0)}
                                            </td>
                                            <td style={{ textAlign: 'center', color: 'var(--success-400)', padding: '1rem' }}>
                                                {Math.round(alloc.installedQty || 0)}
                                            </td>
```

Find the closing `</td>` of the Status cell (the last `<td>` in the row, right before `</tr>`):

```jsx
                                            <td style={{ textAlign: 'center', padding: '1rem' }}>
                                                <span className={`status-badge ${alloc.status === 'FullyInstalled' ? 'status-badge-success' :
                                                        alloc.status === 'PartiallyInstalled' ? 'status-badge-warning' : 'status-badge-info'
                                                    }`}>
                                                    {alloc.status === 'FullyInstalled' ? 'Fully Installed' :
                                                        alloc.status === 'PartiallyInstalled' ? 'Partially Installed' : 'Allocated'}
                                                </span>
                                            </td>
                                        </tr>
```

Replace with:

```jsx
                                            <td style={{ textAlign: 'center', padding: '1rem' }}>
                                                <span className={`status-badge ${alloc.status === 'FullyInstalled' ? 'status-badge-success' :
                                                        alloc.status === 'PartiallyInstalled' ? 'status-badge-warning' : 'status-badge-info'
                                                    }`}>
                                                    {alloc.status === 'FullyInstalled' ? 'Fully Installed' :
                                                        alloc.status === 'PartiallyInstalled' ? 'Partially Installed' : 'Allocated'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '1rem' }}>
                                                <button
                                                    onClick={() => openReceiptModal(alloc)}
                                                    className="btn btn-ghost btn-sm"
                                                    title="Log Receipt"
                                                >
                                                    <Truck size={16} />
                                                </button>
                                            </td>
                                        </tr>
```

- [ ] **Step 5: Add the "Log Receipt" modal**

Insert this immediately before the final closing `</div>` of the component (right after the `</div>` that closes `<div className="glass-card mt-4">`):

```jsx
            {receivingAlloc && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <h3>
                                <Truck size={20} />
                                Log Material Receipt
                            </h3>
                            <button onClick={closeReceiptModal} className="modal-close">
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="device-info-card mb-4">
                                <strong>{receivingAlloc.stockItemId?.deviceType || receivingAlloc.stockItemId?.assetType}</strong>
                                {receivingAlloc.stockItemId?.make && ` - ${receivingAlloc.stockItemId.make} ${receivingAlloc.stockItemId.model || ''}`}
                                <div className="text-sm text-secondary">
                                    PO Qty: {receivingAlloc.allocatedQty} {receivingAlloc.stockItemId?.unit || 'Nos'} · Already Received: {receivingAlloc.receivedQty || 0}
                                </div>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Received Qty</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        value={receiptForm.receivedQty}
                                        onChange={(e) => setReceiptForm(prev => ({ ...prev, receivedQty: parseInt(e.target.value, 10) || 0 }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Extra Qty</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        value={receiptForm.extraQty}
                                        onChange={(e) => setReceiptForm(prev => ({ ...prev, extraQty: parseInt(e.target.value, 10) || 0 }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Received Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={receiptForm.receivedDate}
                                        onChange={(e) => setReceiptForm(prev => ({ ...prev, receivedDate: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mode of Transport</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Road, Air, Courier"
                                        value={receiptForm.modeOfTransport}
                                        onChange={(e) => setReceiptForm(prev => ({ ...prev, modeOfTransport: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Remarks</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="e.g., 2 units short-shipped, packaging damaged..."
                                        value={receiptForm.remarks}
                                        onChange={(e) => setReceiptForm(prev => ({ ...prev, remarks: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={closeReceiptModal} className="btn btn-ghost" disabled={savingReceipt}>
                                Cancel
                            </button>
                            <button onClick={handleLogReceipt} className="btn btn-primary" disabled={savingReceipt}>
                                {savingReceipt ? 'Saving...' : 'Log Receipt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
```

- [ ] **Step 6: Lint check**

Run: `cd frontend && npm run lint -- --no-fix src/pages/fieldops/ProjectAllocatedStockList.jsx`
Expected: no new errors.

- [ ] **Step 7: Manual verification in dev server**

With both servers running: open a project's Allocated Stock page, click the truck icon on a row, fill in Received Qty (e.g. 5) and Extra Qty (e.g. 1), submit. Confirm:
- The "Received" column updates to 5 for that row.
- Clicking "Download Report" downloads an `.xlsx` file; open it and confirm the columns match `SL NO, Material Description, Material Qty in PO, UOM, Received Qty, UOM, Extra Qty, Received Date, Mode of Transport, Remarks` and the row's values match what was just logged.
- Log a second receipt on the same row (e.g. Received Qty 3) and confirm the "Received" column now shows 8 (cumulative), and the downloaded report's "Received Date"/"Mode of Transport" reflect the second entry.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/fieldops/ProjectAllocatedStockList.jsx
git commit -m "feat(fieldops): add Log Receipt modal and report download to Allocated Stock page"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Schema fields (Task 1), receive endpoint with validation/permission/audit-trail (Task 2), export endpoint with exact column set and xlsx generation (Task 3), frontend wiring (Task 4), UI for logging + downloading (Task 5) — all covered. The "one row per receipt event" non-goal is respected: the export aggregates per allocation, not per `receiptLog` entry.
- **Placeholder scan:** No TBD/TODO; every step has complete code.
- **Type consistency:** `logAllocationReceipt(id, data)` in Task 4 matches the `POST /api/stock/allocations/:id/receive` route from Task 2 and the `{ receivedQty, extraQty, receivedDate, modeOfTransport, remarks }` body shape used in both the Task 2 controller and the Task 5 modal form. `exportMaterialReceiptReport(projectId)` in Task 4 matches the Task 3 route and returns a blob consumed identically to the existing `downloadXlsxBlob` pattern in `AssetsList.jsx`.
- **Permission consistency:** Task 2's inline check (Admin/Supervisor or assigned PM/team member) matches the design spec's stated default; Task 3's `canAccessProject` reuse is broader (also includes assigned vendors and the `PROJECT_MANAGEMENT_PORTAL` right) which is appropriate for a read-only report versus a mutating action.
