# Feature Spec: Fix Stock Unit Not Updating from Edit Form

## Problem

When editing a stock item via the stock edit modal, changing the "Unit" dropdown (e.g., from "Nos" to "Meter") does not persist the change. After saving, the unit reverts to its previous value.

## Expected Behavior

1. User opens stock edit modal for an item
2. User changes the Unit dropdown to a different value (e.g., "Meter", "Box", "Roll")
3. User clicks "Save Changes"
4. The PUT `/api/stock/:assetId` request includes the updated `unit` value
5. The database is updated with the new unit
6. The inventory list refreshes and shows the updated unit

## Current Behavior

The unit field appears to not update after saving. The root cause needs to be confirmed by testing — the code path looks correct but there may be a subtle issue with:
- Form state management during edit
- Data sent in the PUT request body
- How the aggregated inventory response reflects individual item changes
- The `quantity` field being sent as a string potentially causing validation issues

## Affected Files

### Backend
- `backend-express/controllers/stock.controller.js` — `updateStock()` (line 656)
- `backend-express/models/Asset.model.js` — `unit` field definition (line 117)

### Frontend
- `frontend/src/pages/stock/InventoryList.jsx` — Edit form, `handleEditChange`, `submitEdit`
- `frontend/src/services/api.js` — `stockApi.updateStock` (line 394)

## Acceptance Criteria

- [ ] Changing the unit in the edit form and saving persists the new value
- [ ] The inventory list shows the updated unit after save
- [ ] Meter-unit items correctly update their `isMeterUnit` flag in the aggregation
- [ ] No regression in other editable stock fields (quantity, make, model, etc.)
