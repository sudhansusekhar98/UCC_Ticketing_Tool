# Implementation Plan: Fix Stock Unit Not Updating from Edit Form

**Branch**: `005-fix-stock-unit-update` | **Date**: 2026-06-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-fix-stock-unit-update/spec.md`

## Summary

When editing stock items, the "Unit" field change does not persist after saving. The code path from frontend to database appears correct, but the `quantity` field is sent as a string from the number input, which may cause Mongoose validation to silently reject the entire `$set` update — including the `unit` change. The fix ensures proper type handling in both frontend and backend, and adds defensive coercion.

## Technical Context

**Language/Version**: JavaScript (Node.js 22, React 19)

**Primary Dependencies**: Express.js, Mongoose, React, Zustand, Vite

**Storage**: MongoDB (Mongoose ODM)

**Testing**: Jest (backend), manual verification (frontend)

**Target Platform**: Web application (Docker on Ubuntu VPS)

**Project Type**: Web service (full-stack)

## Constitution Check

*GATE: Constitution is a template (not customized) — no gates to enforce.*

## Project Structure

### Documentation (this feature)

```text
specs/005-fix-stock-unit-update/
├── plan.md              # This file
├── research.md          # Investigation findings
├── data-model.md        # Asset.unit field and aggregation details
├── quickstart.md        # How to reproduce and verify
└── tasks.md             # Implementation tasks (next step)
```

### Source Code (repository root)

```text
backend-express/
├── controllers/
│   └── stock.controller.js    # updateStock() — add quantity coercion
└── models/
    └── Asset.model.js         # unit field definition (no change needed)

frontend/
└── src/
    └── pages/
        └── stock/
            └── InventoryList.jsx  # submitEdit() — fix quantity type
```

**Structure Decision**: Existing web application structure. Bug fix touches 2 files (1 backend controller, 1 frontend component).

## Implementation Approach

### Fix 1: Frontend — Parse quantity before submit (InventoryList.jsx)

In `submitEdit()`, ensure `quantity` is sent as a number:

```javascript
const submitEdit = async (e) => {
    e.preventDefault();
    if (!editAsset?._id) return;
    try {
        setSaving(true);
        const payload = {
            ...editForm,
            quantity: editForm.quantity !== '' ? Number(editForm.quantity) : 1,
        };
        await stockApi.updateStock(editAsset._id, payload);
        // ...
    }
};
```

### Fix 2: Backend — Defensive coercion in updateStock (stock.controller.js)

After building `updateData`, coerce `quantity` to a number if present:

```javascript
if (updateData.quantity !== undefined) {
    updateData.quantity = Number(updateData.quantity) || 1;
}
```

This ensures the database update never fails due to type mismatch, regardless of what the frontend sends.

### Fix 3: Verify aggregation reflects updated unit

After the update round-trip, confirm that `fetchData()` returns the aggregated inventory with the correct `unit` and recomputed `isMeterUnit` flag for the edited item.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Fix breaks other editable fields | Low | Medium | Test all fields in edit form |
| Meter/Nos toggle affects stock counts | Medium | Low | Verify count aggregation after unit change |
| Quantity coercion edge case (empty string, NaN) | Low | Low | Fallback to `1` on invalid parse |

## Complexity Tracking

No constitution violations — this is a straightforward 2-file bug fix.
