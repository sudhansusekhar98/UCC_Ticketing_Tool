# Quickstart: Fix Stock Unit Update

## Setup

```bash
# Terminal 1: Backend
cd backend-express && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Reproduce the Bug

1. Open http://localhost:5173 and log in as Admin
2. Navigate to Stock/Inventory page
3. Click edit on any stock item
4. Change the Unit dropdown from "Nos" to "Meter" (or any other value)
5. Click "Save Changes"
6. Observe that the unit in the list still shows the old value

## Verify the Fix

1. Repeat steps 1-5 above
2. Confirm the unit column shows the new value after save
3. Refresh the page — confirm the value persists
4. Edit the same item again — confirm the edit form shows the new unit
5. Test changing unit from "Meter" back to "Nos" — confirm it works both ways
6. Test editing quantity and unit at the same time — confirm both update

## Key Files to Modify

| File | What to Change |
|------|---------------|
| `frontend/src/pages/stock/InventoryList.jsx` | `submitEdit` — ensure `quantity` is sent as a number |
| `backend-express/controllers/stock.controller.js` | `updateStock` — add type coercion for `quantity` |
