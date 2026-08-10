# Tasks: Fix Stock Unit Update

## Phase 1: Core Fix

- [X] **T1**: Fix `submitEdit` in `frontend/src/pages/stock/InventoryList.jsx` to coerce `quantity` to a number before sending the API request
- [X] **T2**: Add defensive `quantity` coercion in `updateStock` in `backend-express/controllers/stock.controller.js`

## Phase 2: Verification

- [X] **T3**: Verify the fix by reviewing the complete data flow end-to-end
