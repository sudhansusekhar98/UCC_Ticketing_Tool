# PM Daily Log: Inline Device Installation Tracking

## Problem

The PM Daily Log's "Activities Worked Today" section lets a PM check off tasks
against an activity, but activities only represent plans/tasks — they don't
capture which physical devices were actually installed at site that day.
Today, logging a device install requires leaving the Daily Log and using the
separate "Add Device Installation" screen (`DeviceInstallationForm.jsx`), which
is full of fields (serials, MAC, cable/network details) that are overkill for
a quick end-of-day summary, and disconnects the device install from the daily
log / activity it happened under.

Not every installed device needs configuration — poles, cantilevers, and other
non-IP/passive items skip that step entirely. The PM needs to flag this per
device at the point of logging the install.

## Goals

- Let a PM declare "N of this device type installed today" per activity,
  directly inside the Daily Log form, without a page navigation.
- Let the PM flag whether each installed device type needs configuration.
- Installed quantities must deduct from the same `ProjectStockAllocation`
  records the rest of the system already tracks, so stock-remaining figures
  and the Allocated Stock tab stay correct without a separate reconciliation
  step.

## Non-Goals

- Serial number / MAC / cable / network detail capture — that stays the job
  of the existing `DeviceInstallationForm.jsx` (the "Devices" section), which
  remains unchanged and is still where a PM goes for precise per-unit records.
- Auto-converting non-configurable devices to `Asset` records inline (the
  existing `skip-config` endpoint does this later, as a distinct explicit
  action in the Devices section — not duplicated here).
- Any change to the 24-hour log lock, GPS capture, or photo upload behavior.

## Data Model

No schema changes. Existing fields already support this:

- `Activity.requiredDevices[]` — `{ deviceTypeId, deviceTypeName, allocationId, qty }`
  — the planned device needs per activity, already returned in full by
  `GET /api/fieldops/projects/:projectId/daily-log/prefill` (no query
  projection limits the returned fields).
- `DeviceInstallation` — already has `activityId`, `linkedDailyLogId`,
  `requiresConfiguration` (default `true`), `status` enum including
  `Installed`/`Deployed`. `POST /api/fieldops/devices/bulk` accepts these as
  plain body fields and passes them straight into `DeviceInstallation.create()`.
- `ProjectStockAllocation.installedQty` / `status` — the bulk-create
  controller already does `allocation.installedQty += quantity; allocation.save()`
  per device row when `allocationId` is present, and the model's pre-save
  hook auto-recalculates `status` (`Allocated` → `PartiallyInstalled` →
  `FullyInstalled`) from the updated quantities. This is the existing
  mechanism this feature reuses — no new update logic needed.

## Frontend Changes (`PMDailyLogForm.jsx` only)

### New data fetch

On load, alongside the existing `getProjectById` / `getDailyLogPrefill` calls,
fetch `stockApi.getProjectAllocatedStock(projectId)` (same call
`DeviceInstallationForm.jsx` already makes) to get each allocation's
`remainingQty`, keyed by `allocationId`. Non-blocking like the existing
prefill fetch — if it fails, device rows just render without a remaining-qty
cap/badge.

### State

Each entry in `activityEntries` gains a `deviceInstalls` array, built when the
activity is first selected (`toggleActivitySelection`), seeded from that
activity's `requiredDevices`:

```js
deviceInstalls: (activity.requiredDevices || [])
  .filter(rd => rd.allocationId)
  .map(rd => ({
    deviceTypeId: rd.deviceTypeId,
    deviceTypeName: rd.deviceTypeName,
    allocationId: rd.allocationId,
    installedQty: 0,
    requiresConfiguration: true
  }))
```

`requiredDevices` entries without an `allocationId` are skipped — there's no
stock allocation to deduct from, so there's nothing meaningful to log.

### UI

Inside the existing expanded activity block, after the task list and before
the progress-note textarea, a new "Devices Installed Today" subsection renders
one compact row per `deviceInstalls` entry (skipped entirely if the array is
empty — most Construction-type activities have no `requiredDevices`):

- Device type name + a small "`X` remaining" badge sourced from the allocated
  stock lookup (if found).
- Number input for `installedQty`, `min=0`, `max=remainingQty` (uncapped if
  the lookup didn't resolve).
- Checkbox "Requires Configuration", checked by default.

No new CSS component patterns — reuses `form-input`, existing row/flex inline
styles already used for the task list in this file, and the same
`--text-muted` remaining-count style used elsewhere (e.g. `pd-count-label`).

### Submit flow

Entirely optional — a `deviceInstalls` row with `installedQty === 0` is
simply not submitted; nothing about the existing required-field validation
changes.

After the log itself is created/updated (existing `savedLogId` from
`createPMDailyLog`/`updatePMDailyLog`) and before navigating away:

1. Flatten every `deviceInstalls` row with `installedQty > 0` across all
   `activityEntries` into a `devices` array:
   ```js
   {
     projectId,
     activityId,               // the parent activity entry's id
     deviceType: deviceTypeName,
     allocationId,
     quantity: installedQty,
     status: requiresConfiguration ? 'Installed' : 'Deployed',
     requiresConfiguration,
     linkedDailyLogId: savedLogId
   }
   ```
2. If the array is non-empty, call the existing
   `fieldOpsApi.createBulkDeviceInstallations({ devices })` — the same
   endpoint `DeviceInstallationForm.jsx` already uses for its multi-select
   bulk path. No backend change.
3. On response, if `errors.length > 0`, show one toast listing which device
   types failed (e.g. stock consumed elsewhere since page load) — the log
   submission itself is already complete at this point, so a partial device
   failure never blocks or rolls back the log. This mirrors the existing
   pattern where photo upload failures after log creation don't fail the
   whole submission.

### What this does NOT touch

- `Activity.progressPercentage` / task completion logic — unchanged.
- The Devices section / `DeviceInstallationList.jsx` — devices created this
  way appear there exactly like any other bulk-created device (status
  `Installed` or `Deployed`, `linkedDailyLogId` set), with no new fields to
  render there.
- `AllocatedStockTab.jsx` / stock-remaining hero stat — these already read
  `installedQty`/`remainingQty` off `ProjectStockAllocation`, so they reflect
  the new installs automatically via the existing pre-save hook.

## Error Handling

- Quantity exceeding remaining stock: caught server-side per-row by the
  existing bulk-create validation (`quantity > remaining` → row added to
  `errors[]`, other rows still process). Surfaced as a toast after log save.
- Draft autosave (existing feature): `deviceInstalls` is part of
  `activityEntries`, which the existing autosave effect already persists as
  a whole — no separate autosave wiring needed.

## Testing

- Manual: submit a log with one activity selected, enter a quantity on a
  device row, toggle "Requires Configuration" off, submit, and verify (a) the
  daily log saves, (b) a `DeviceInstallation` record appears under that
  project/activity with `status: 'Deployed'`, `requiresConfiguration: false`,
  (c) the corresponding `ProjectStockAllocation.installedQty` increases and
  `status` updates on the Allocated Stock tab.
- Manual: enter a quantity exceeding remaining stock, submit, verify the log
  still saves and a toast names the failed device type.
- Manual: leave all device quantities at 0, submit, verify no
  `createBulkDeviceInstallations` call is made (network tab) and the log
  saves normally.
