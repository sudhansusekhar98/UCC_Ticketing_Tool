# Research: Stock Unit Update Bug

## Investigation Summary

Traced the complete data flow from frontend form → API request → controller → database → response → display.

### Code Path Analysis

| Step | File | Line(s) | Status |
|------|------|---------|--------|
| Model field definition | Asset.model.js | 117-122 | OK — `unit: String, default: 'Nos'` |
| Edit form initialization | InventoryList.jsx | 223 | OK — `unit: asset.unit \|\| 'Nos'` |
| Form select element | InventoryList.jsx | 858-874 | OK — `name="unit"`, `value={editForm.unit}` |
| Change handler | InventoryList.jsx | 228-231 | OK — generic `setEditForm` with `[name]: value` |
| Submit handler | InventoryList.jsx | 233-248 | OK — sends `editForm` which includes `unit` |
| API call | api.js | 394 | OK — `api.put('/stock/${assetId}', data)` |
| Route | stock.routes.js | 70 | OK — `router.put('/:assetId', ..., updateStock)` |
| Allowed fields | stock.controller.js | 662 | OK — `unit` is in `allowedFields` array |
| Field extraction | stock.controller.js | 663-668 | OK — loops `allowedFields`, checks `req.body[field]` |
| Database save | stock.controller.js | 693-697 | OK — `findByIdAndUpdate` with `$set` |
| Inventory fetch | stock.controller.js | 67-148 | OK — aggregation `$push` includes `unit: '$unit'` |

### Identified Potential Issues

1. **Quantity as string**: The `handleEditChange` handler stores `quantity` as a string from the number input. When sent to the backend, Mongoose coerces `String → Number`, but if `runValidators: true` and the string is empty (`""`), validation may fail silently — rejecting the entire `$set` update including `unit`.

2. **No error feedback on partial failure**: The `updateStock` controller doesn't log what fields were actually updated. If the update fails due to validation, the frontend still calls `fetchData()` and shows the old data.

3. **Response not used**: After `stockApi.updateStock()`, the response data is not used — instead `fetchData()` re-fetches the full aggregated inventory. This is correct but means any server-side rejection is invisible.

### Decision

The fix should:
1. Ensure `quantity` is sent as a number (not string) to prevent validation edge cases
2. Add defensive parsing in `submitEdit` before sending
3. Verify the fix by testing the actual update round-trip

### Alternatives Considered

- Adding a separate `unit` update endpoint — rejected as unnecessary; the existing endpoint supports `unit`
- Using `save()` instead of `findByIdAndUpdate` — rejected; `$set` is more efficient and the encryption middleware already handles it
