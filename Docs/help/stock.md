# Stock & Inventory Module

## Overview

The Stock & Inventory module tracks spare parts, cables, and consumable materials across all sites. It provides visibility into what is available, logs every movement, and automatically keeps quantities accurate as items are used in ticket repairs.

---

## Features

- View spare parts and cable stock per site
- Record cable/wire consumption linked to tickets
- Transfer stock between sites
- Manage requisitions for replenishment
- Full movement history per asset

---

## Inventory List

Shows all assets currently in **Spare** status, grouped by site and asset type.

### Cable and Wire Items

Items with a unit of **meter**, **m**, or **mtr** are treated as bulk cable stock. They display their available quantity in meters rather than a count.

- These items appear in the **Cable / Wire Usage** panel on relevant tickets.
- Quantity is deducted in real time when engineers record usage from a ticket.
- When quantity reaches **0**, the item remains visible so stock managers can see it needs reordering.

---

## Cable Usage via Tickets

Cable consumption is recorded directly from the **Ticket Detail** page, not from this module.

### How it works

1. A ticket is created with a Sub-Category of **Fibre Cut**, **Cable Cut**, or **Cable Damage**.
2. The **Cable / Wire Usage** panel appears on the ticket detail page.
3. Engineers select a cable item, enter the quantity used (in the item's stored unit), and optionally add a note.
4. The quantity is deducted immediately from the stock asset record.
5. A movement log entry (type: **CableUsed**) is created and linked to the ticket.

### Viewing cable usage history

All cable usage entries for a ticket appear in the **Usage History** section of the Cable / Wire Usage panel. Each entry shows:

- Cable item name
- Quantity consumed (with unit)
- Who recorded it
- Date and time
- Note (if provided)

---

## Stock Movement Log

Every change to stock — transfers, RMA movements, cable usage — is recorded in the movement log. For cable usage entries, the log shows:

| Field | Value |
|---|---|
| Movement Type | CableUsed |
| Quantity Change | Negative value (e.g. −15 for 15 meters used) |
| Ticket Reference | Linked ticket number |
| Performed By | Engineer who recorded usage |

---

## Requisitions

When stock runs low, raise a requisition to request replenishment from the head office or admin.

1. Click **New Requisition** in the Stock module.
2. Select the item and quantity needed.
3. A Supervisor or Admin reviews and approves or rejects the request.
4. Once approved, stock is fulfilled and the quantity is updated.

---

## Transfers

Admins can initiate transfers to move stock between sites:

1. **Initiate** — Admin selects source site, destination site, and items.
2. **Dispatch** — Admin confirms items are shipped.
3. **Receive** — Destination site confirms receipt and quantity is added to their stock.

---

## Tips

1. **Keep cable items updated** — ensure cables in stock have the correct unit (meter/m) so they appear in the Cable Usage panel on tickets.
2. **Monitor items at 0** — zero-quantity items are kept visible so stock managers know what needs reordering.
3. **Use the movement log** to audit exactly when and why stock changed.
4. **Raise requisitions early** — do not wait until stock reaches 0 before requesting replenishment.
