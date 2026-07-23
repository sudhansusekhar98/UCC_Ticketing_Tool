# PM Daily Log: Inline Device Installation Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a PM declare, per activity, how many devices of each required type were installed today and whether each type needs configuration — directly inside `PMDailyLogForm.jsx` — without leaving the Daily Log page.

**Architecture:** Pure frontend change to `frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`. No backend or schema changes: the daily-log prefill endpoint already returns each activity's full `requiredDevices` array, and the existing `POST /api/fieldops/devices/bulk` endpoint already accepts `activityId`, `requiresConfiguration`, and `linkedDailyLogId` as plain body fields and already updates `ProjectStockAllocation.installedQty`/`status` when an `allocationId` is supplied.

**Tech Stack:** React 19 (function components + hooks), existing `fieldOpsApi`/`stockApi` axios wrappers, `react-hot-toast`.

## Global Constraints

- No backend/model/route changes — reuse `GET /api/fieldops/projects/:projectId/daily-log/prefill`, `GET /api/stock/allocations/for-device-form`, and `POST /api/fieldops/devices/bulk` exactly as they exist today.
- No new npm dependencies.
- The frontend has no unit test framework configured (no vitest/jest/testing-library in `frontend/package.json`) — verification for each task is `npm run lint` (must stay clean, matching the file's pre-existing lint baseline) plus a manual check in the running dev server. Do not introduce a new test framework to satisfy this plan.
- Device rows are entirely optional — a `deviceInstalls` row left at `installedQty: 0` must never block or alter daily-log submission validation.
- Reference spec: `docs/superpowers/specs/2026-07-23-daily-log-device-installs-design.md`.

---

### Task 1: Fetch allocated stock and seed `deviceInstalls` per selected activity

**Files:**
- Modify: `frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`

**Interfaces:**
- Consumes: `stockApi.getProjectAllocatedStock(projectId)` → `{ data: { data: [{ allocationId, deviceType, remainingQty, ... }] } }` (existing, `frontend/src/services/api.js:407`).
- Produces: new state `allocatedStockByAllocationId` (a `Map<string, { remainingQty: number, unit: string }>`), and each `activityEntries[i]` gains a `deviceInstalls: Array<{ deviceTypeId, deviceTypeName, allocationId, installedQty, requiresConfiguration }>` — read by Task 2 (render) and Task 3 (submit).

- [ ] **Step 1: Add the `stockApi` import**

In `frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`, the current import line is:

```js
import { fieldOpsApi } from '../../../services/api';
```

Change it to:

```js
import { fieldOpsApi, stockApi } from '../../../services/api';
```

- [ ] **Step 2: Add allocated-stock state and fetch it in `loadData`**

Find the state declarations block (around the existing `openActivities`/`activityEntries` state) and add:

```js
const [allocatedStockByAllocationId, setAllocatedStockByAllocationId] = useState(new Map());
```

In `loadData`, the existing prefill fetch looks like this:

```js
            // Load open activities for prefill (non-blocking)
            try {
                const prefillRes = await fieldOpsApi.getDailyLogPrefill(projectId);
                setOpenActivities(prefillRes.data.data || []);
            } catch { /* non-blocking */ }
```

Add a second non-blocking fetch immediately after it, inside the same `try` block of `loadData` (after the existing `try { ... } catch { /* non-blocking */ }` for prefill):

```js
            // Load allocated stock for remaining-qty lookups (non-blocking)
            try {
                const stockRes = await stockApi.getProjectAllocatedStock(projectId);
                const map = new Map(
                    (stockRes.data.data || []).map(item => [
                        item.allocationId,
                        { remainingQty: item.remainingQty, unit: item.unit }
                    ])
                );
                setAllocatedStockByAllocationId(map);
            } catch { /* non-blocking */ }
```

- [ ] **Step 3: Seed `deviceInstalls` when an activity is selected**

Find `toggleActivitySelection`:

```js
    const toggleActivitySelection = (activity) => {
        if (isActivitySelected(activity._id)) {
            setActivityEntries(prev => prev.filter(e => e.activityId !== activity._id));
        } else {
            setActivityEntries(prev => [...prev, {
                activityId: activity._id,
                activityTitle: activity.title,
                tasksWorked: (activity.tasks || []).map(t => ({
                    taskId: t._id,
                    taskTitle: t.title,
                    completed: false,
                    delayReason: ''
                })),
                progressNote: ''
            }]);
        }
    };
```

Replace it with:

```js
    const toggleActivitySelection = (activity) => {
        if (isActivitySelected(activity._id)) {
            setActivityEntries(prev => prev.filter(e => e.activityId !== activity._id));
        } else {
            setActivityEntries(prev => [...prev, {
                activityId: activity._id,
                activityTitle: activity.title,
                tasksWorked: (activity.tasks || []).map(t => ({
                    taskId: t._id,
                    taskTitle: t.title,
                    completed: false,
                    delayReason: ''
                })),
                progressNote: '',
                deviceInstalls: (activity.requiredDevices || [])
                    .filter(rd => rd.allocationId)
                    .map(rd => ({
                        deviceTypeId: rd.deviceTypeId,
                        deviceTypeName: rd.deviceTypeName,
                        allocationId: rd.allocationId,
                        installedQty: 0,
                        requiresConfiguration: true
                    }))
            }]);
        }
    };
```

- [ ] **Step 4: Add a setter for device-install rows**

Immediately after `setActivityProgressNote` (which already exists), add:

```js
    const setDeviceInstallQty = (activityId, allocationId, qty) => {
        setActivityEntries(prev => prev.map(entry =>
            entry.activityId !== activityId ? entry : {
                ...entry,
                deviceInstalls: entry.deviceInstalls.map(di =>
                    di.allocationId !== allocationId ? di : { ...di, installedQty: qty }
                )
            }
        ));
    };

    const setDeviceRequiresConfiguration = (activityId, allocationId, requiresConfiguration) => {
        setActivityEntries(prev => prev.map(entry =>
            entry.activityId !== activityId ? entry : {
                ...entry,
                deviceInstalls: entry.deviceInstalls.map(di =>
                    di.allocationId !== allocationId ? di : { ...di, requiresConfiguration }
                )
            }
        ));
    };
```

- [ ] **Step 5: Lint check**

Run: `cd frontend && npm run lint -- --no-fix src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`
Expected: no new errors (pre-existing warnings in this file, if any, are unaffected).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx
git commit -m "feat(fieldops): seed device-install state per activity in daily log form"
```

---

### Task 2: Render the "Devices Installed Today" subsection per activity

**Files:**
- Modify: `frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`

**Interfaces:**
- Consumes: `entry.deviceInstalls` and `allocatedStockByAllocationId` from Task 1; `setDeviceInstallQty(activityId, allocationId, qty)` and `setDeviceRequiresConfiguration(activityId, allocationId, bool)` from Task 1.
- Produces: nothing new for later tasks — this is the render layer only.

- [ ] **Step 1: Insert the subsection after the task list, inside the expanded activity block**

Find this block (the task-list rendering inside the expanded activity, ending with the `progressNote` textarea):

```jsx
                                                <textarea
                                                    className="form-textarea"
                                                    style={{ marginTop: '0.5rem', fontSize: '0.8rem', rows: 2, minHeight: 48 }}
                                                    placeholder="Activity progress note (optional)…"
                                                    value={entry.progressNote}
                                                    onChange={e => setActivityProgressNote(activity._id, e.target.value)}
                                                    rows={2}
                                                />
                                            </div>
                                        )}
```

Insert a new block immediately **before** that `<textarea>` (i.e. right after the closing `</div>` of the `tasksWorked` mapping loop, still inside `{selected && entry && ( ... )}`):

```jsx
                                                {entry.deviceInstalls.length > 0 && (
                                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-light,rgba(148,163,184,0.1))' }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                                                            Devices Installed Today
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {entry.deviceInstalls.map(di => {
                                                                const stockInfo = allocatedStockByAllocationId.get(di.allocationId);
                                                                const remaining = stockInfo?.remainingQty;
                                                                return (
                                                                    <div key={di.allocationId} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                                        <span style={{ fontSize: '0.82rem', flex: '1 1 160px', color: 'var(--text-primary)' }}>
                                                                            {di.deviceTypeName}
                                                                            {remaining !== undefined && (
                                                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                                                                                    ({remaining} remaining)
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                        <input
                                                                            type="number"
                                                                            className="form-input"
                                                                            style={{ width: 72, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                                                                            min="0"
                                                                            max={remaining !== undefined ? remaining : undefined}
                                                                            value={di.installedQty}
                                                                            onChange={e => {
                                                                                const raw = parseInt(e.target.value, 10);
                                                                                const qty = Number.isNaN(raw) ? 0 : Math.max(0, remaining !== undefined ? Math.min(raw, remaining) : raw);
                                                                                setDeviceInstallQty(activity._id, di.allocationId, qty);
                                                                            }}
                                                                        />
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={di.requiresConfiguration}
                                                                                onChange={e => setDeviceRequiresConfiguration(activity._id, di.allocationId, e.target.checked)}
                                                                                style={{ width: 14, height: 14 }}
                                                                            />
                                                                            Requires Configuration
                                                                        </label>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
```

- [ ] **Step 2: Lint check**

Run: `cd frontend && npm run lint -- --no-fix src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`
Expected: no new errors.

- [ ] **Step 3: Manual verification in dev server**

Run: `cd frontend && npm run dev` (and backend `cd backend-express && npm run dev` in a second terminal, if not already running).
In the browser: open a project with at least one activity that has `requiredDevices` referencing an allocation with `remainingQty > 0`, go to Submit Daily Log, select that activity, and confirm the "Devices Installed Today" rows render with a working quantity input (capped at remaining) and a checked-by-default "Requires Configuration" checkbox.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx
git commit -m "feat(fieldops): render devices-installed-today rows in daily log"
```

---

### Task 3: Submit device installs via the existing bulk-create endpoint

**Files:**
- Modify: `frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`

**Interfaces:**
- Consumes: `fieldOpsApi.createBulkDeviceInstallations({ devices })` → `{ data: { data: [...], errors: [...] } }` (existing, `frontend/src/services/api.js:450`); `activityEntries[i].deviceInstalls` from Task 1.
- Produces: nothing further — terminal task for this plan.

- [ ] **Step 1: Flatten and submit device rows after the log itself saves**

Find the existing submit logic in `handleSubmit`:

```js
            const savedLogId = logResponse.data.data._id || logId;

            // Upload photos if any
            if (selectedFiles.length > 0) {
                const photoFormData = new FormData();
                selectedFiles.forEach(({ file }) => {
                    photoFormData.append('photos', file);
                });
                photoFormData.append('photoType', 'Progress');

                await fieldOpsApi.uploadPMLogPhotos(savedLogId, photoFormData);
            }

            localStorage.removeItem(draftKey);
            toast.success(isEditing ? 'Log updated successfully' : 'Daily log submitted successfully');
            navigate(`/fieldops/projects/${projectId}`);
```

Replace it with:

```js
            const savedLogId = logResponse.data.data._id || logId;

            // Upload photos if any
            if (selectedFiles.length > 0) {
                const photoFormData = new FormData();
                selectedFiles.forEach(({ file }) => {
                    photoFormData.append('photos', file);
                });
                photoFormData.append('photoType', 'Progress');

                await fieldOpsApi.uploadPMLogPhotos(savedLogId, photoFormData);
            }

            // Create device installation records for any devices logged as installed today
            const devicesToCreate = activityEntries.flatMap(entry =>
                (entry.deviceInstalls || [])
                    .filter(di => di.installedQty > 0)
                    .map(di => ({
                        projectId,
                        activityId: entry.activityId,
                        deviceType: di.deviceTypeName,
                        allocationId: di.allocationId,
                        quantity: di.installedQty,
                        status: di.requiresConfiguration ? 'Installed' : 'Deployed',
                        requiresConfiguration: di.requiresConfiguration,
                        linkedDailyLogId: savedLogId
                    }))
            );

            if (devicesToCreate.length > 0) {
                try {
                    const deviceRes = await fieldOpsApi.createBulkDeviceInstallations({ devices: devicesToCreate });
                    const errorCount = deviceRes.data.errors?.length || 0;
                    if (errorCount > 0) {
                        const failedTypes = deviceRes.data.errors.map(e => e.device?.deviceType || 'Unknown device').join(', ');
                        toast.error(`${errorCount} device type(s) failed to log: ${failedTypes}`, { duration: 8000 });
                    }
                } catch {
                    toast.error('Log saved, but device installs failed to record. Log them from the Devices section.');
                }
            }

            localStorage.removeItem(draftKey);
            toast.success(isEditing ? 'Log updated successfully' : 'Daily log submitted successfully');
            navigate(`/fieldops/projects/${projectId}`);
```

- [ ] **Step 2: Lint check**

Run: `cd frontend && npm run lint -- --no-fix src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`
Expected: no new errors.

- [ ] **Step 3: Manual verification in dev server**

With both servers running: submit a daily log with one activity selected, enter a quantity > 0 on one device row, leave "Requires Configuration" checked, submit. Then:
- Confirm the log saved (toast + redirect to project detail).
- Open **Field Ops → Project → Devices** and confirm a new `DeviceInstallation` record exists with the entered quantity, `status: Installed`, and `activityId` set.
- Open **Field Ops → Project → Allocated Stock** and confirm that allocation's `installedQty` increased by the entered quantity and its status badge updated accordingly (e.g. `Allocated` → `PartiallyInstalled`).

Then repeat with "Requires Configuration" unchecked and confirm the created device's status is `Deployed` instead.

Then submit a log with all device quantities left at 0 and confirm (via the Network tab) that no `POST /api/fieldops/devices/bulk` call is made.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx
git commit -m "feat(fieldops): submit device installs from daily log via bulk-create endpoint"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Data fetch (Task 1), per-activity `deviceInstalls` seeding (Task 1), UI rows with remaining-qty cap and configuration checkbox (Task 2), submit-time bulk creation with `status`/`requiresConfiguration`/`linkedDailyLogId` (Task 3), optional-by-default behavior (Task 3, zero-quantity rows filtered out before submit), error surfacing without blocking log save (Task 3) — all covered.
- **Type consistency:** `deviceInstalls` shape (`deviceTypeId`, `deviceTypeName`, `allocationId`, `installedQty`, `requiresConfiguration`) is identical across Task 1 (seed), Task 2 (render), and Task 3 (submit mapping).
- **Out of scope confirmed unimplemented here:** serial/MAC/cable capture, asset auto-conversion on `Deployed` — both explicitly deferred to the existing Devices section per the spec.
