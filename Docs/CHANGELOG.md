# Changelog

All notable changes to TicketOps are documented here.

---

## [Unreleased] — June 2026

### Added — Cable / Fiber Cut Ticket Stock Integration

Tickets raised for fiber or cable cut issues can now track cable consumption directly, and stock quantities are adjusted automatically based on what engineers use during the repair.

#### Create Ticket — Sub-Category Smart Suggestions

- The **Sub-Category** field now shows clickable suggestion chips whenever a Category is selected. Chips are tailored per category (e.g., "Fibre Cut", "Cable Cut" appear under Connectivity and Network).
- Changing the Category resets the Sub-Category so suggestions are always relevant.
- When a cable-related Sub-Category is selected ("Fibre Cut", "Cable Cut", "Cable Damage"), a blue info notice appears:
  > *Cable stock tracking will be enabled on this ticket.*

#### Ticket Detail — Cable / Wire Usage Panel

A new **Cable / Wire Usage** panel appears automatically on the ticket detail page when the ticket's Sub-Category is identified as a cable/fiber cut issue.

**Available at Site section:**
- Lists all cable and wire assets (Spare status) held at the ticket's site.
- Shows item name, type, make/model, quantity, and unit (e.g., 50 meters, 3 boxes).
- Updates in real time after each usage entry.

**Record Usage:**
- Engineers click **Record Usage** to open a modal.
- Select the cable item from a dropdown; items with zero stock are shown but disabled.
- Enter the quantity used — the unit is shown inline. Validation prevents entering more than what is available.
- Add an optional note (e.g., location of repair).
- On confirm, the stock quantity is deducted immediately. If it reaches zero, the item stays visible at 0.

**Usage History section:**
- Shows all cable consumptions logged for the ticket.
- Each entry displays: cable item, quantity used, engineer name, and timestamp.
- Running total of all meters/units used is shown.

**Access control:**
- Admin, Supervisor, Dispatcher, L1 Engineer, L2 Engineer can record usage.
- Panel is read-only once the ticket is Resolved, Verified, Closed, or Cancelled.
- Only stock from the ticket's own site is accessible (no cross-site cable usage).

#### Backend

- `StockMovementLog` model: added `CableUsed` movement type and `quantityChange` field to record quantity consumed per entry.
- New API endpoints:
  - `GET /api/stock/cables?siteId=` — returns cable/wire assets in Spare status for a site.
  - `POST /api/stock/cable-usage` — records usage, deducts quantity from asset, writes movement log.
  - `GET /api/stock/cable-usage/:ticketId` — returns all cable usage entries for a ticket.

#### Documentation

- `Docs/help/tickets.md` — updated with Sub-Category suggestions guide, cable ticket workflow, and Cable / Wire Usage Panel instructions.
- `Docs/help/stock.md` — new help page for the Stock & Inventory module covering cable stock, usage tracking, requisitions, and transfers.
- `Docs/help/README.md` — added Stock & Inventory module to the module table.

---

## Previous Releases

### Security & Email — May 2026

- Password reset email flow via Brevo SMTP.
- Security audit: rate limiting increased on auth endpoints, input sanitization hardened.
- Brevo email provider configured for transactional emails.

### Stock Summary Report — April 2026

- Exportable stock summary report grouped by device type, make, and model.
- Supports both Excel (`.xlsx`) and HTML formats.
- Accessible to Admin and Supervisor roles, or users with the `MANAGE_SITE_STOCK` right.
