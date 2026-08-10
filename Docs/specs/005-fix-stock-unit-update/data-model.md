# Data Model: Stock Unit Update

## Affected Entity: Asset (Stock Items)

### Field: `unit`

| Property | Value |
|----------|-------|
| Type | String |
| Max Length | 50 |
| Default | `'Nos'` |
| Validation | None (no enum constraint) |
| Location | `backend-express/models/Asset.model.js:117-122` |

### Valid Unit Values (Frontend)

| Value | Label |
|-------|-------|
| `Nos` | Numbers (default) |
| `Meter` | Meter |
| `Box` | Box |
| `Set` | Set |
| `Pair` | Pair |
| `Roll` | Roll |

### Related Computed Field: `isMeterUnit`

Computed in the `getInventory` aggregation pipeline (`stock.controller.js:116-121`):

```javascript
isMeterUnit: {
    $in: [
        { $toLower: { $ifNull: ['$unit', 'nos'] } },
        ['meter', 'meters', 'm']
    ]
}
```

This flag affects how the item is displayed (meter badge) and counted (excluded from stock total count).

## Update Flow

```
Frontend editForm.unit (String)
  → PUT /api/stock/:assetId { unit: "Meter" }
    → stock.controller.js updateStock()
      → allowedFields check (unit is included)
      → Asset.findByIdAndUpdate($set: { unit: "Meter" })
        → pre('findOneAndUpdate') encryption middleware (skips unit — not sensitive)
      → Response: updated Asset document
  → fetchData() re-fetches aggregated inventory
    → isMeterUnit recomputed from new unit value
```
