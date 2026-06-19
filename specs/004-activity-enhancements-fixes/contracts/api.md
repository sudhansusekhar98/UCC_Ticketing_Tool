# API Contracts: VChart Analytics Dashboard

## New Endpoint

### GET `/api/tickets/dashboard/trends`

**Auth**: `protect` (JWT required)

**Query Params**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | `YYYY-MM-DD` | No | Default: 30 days ago |
| `endDate` | `YYYY-MM-DD` | No | Default: today |
| `siteId` | ObjectId string | No | Filter by site |

**Response 200**:
```json
{
  "success": true,
  "data": {
    "trends": [
      { "date": "2026-04-22", "created": 5, "resolved": 3 },
      { "date": "2026-04-23", "created": 8, "resolved": 6 }
    ],
    "currentStats": {
      "totalCreated": 142,
      "totalResolved": 118,
      "openTickets": 24,
      "slaCompliancePercent": 87
    },
    "previousStats": {
      "totalCreated": 131,
      "totalResolved": 104,
      "openTickets": 28,
      "slaCompliancePercent": 82
    }
  }
}
```

**Error 400**: `startDate` after `endDate`  
**Error 500**: Aggregation failure (passes to `next(error)`)

**Notes**:
- Role-based filtering: Non-Admin users see only tickets on their assigned sites (same logic as existing stats endpoint)
- `trends` array has one entry per calendar day in the range (days with zero activity may be omitted or included with 0s — frontend handles gaps)
- `previousStats` covers the same duration window shifted back by the range length

---

## Existing Endpoint (unchanged, reused)

### GET `/api/tickets/dashboard/stats`

Already returns `ticketsByPriority`, `ticketsByCategory`, `ticketsByStatus` used by:
- `TicketsByPriorityChart` (half-donut pie)
- `TicketsByCategoryChart` (circle packing)
- `SLAStatusChart` (linear progress)
- `MetricsRow` (KPI cards for current snapshot values)
