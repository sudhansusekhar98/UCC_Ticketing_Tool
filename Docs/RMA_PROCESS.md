# RMA (Return Merchandise Authorization) Process

This document outlines the current RMA workflow implemented in the UCC Ticketing Tool. The system supports two primary simplified workflows: **Repair Only** and **Repair & Replace**.

---

## 1. RMA Initiation
An RMA request is typically initiated from a **Ticket Detail** page by an Engineer or Administrator when an asset is found to be faulty.

- **Mandatory Information**: Reason for request and shipping details.
- **Workflow Type**:
  - `RepairOnly`: The faulty device will be sent for repair and returned to the site.
  - `RepairAndReplace`: A replacement device is arranged while the faulty one is being repaired.
- **Approval**:
  - If created by an **Admin/Supervisor** or a user with `DIRECT_RMA_GENERATE` rights, it is **Auto-Approved**.
  - Otherwise, it stays in `Requested` status until an Admin approves it.

---

## 2. The Repair Path (Faulty Item Workflow)

Depending on the site's capability and Admin instructions, the faulty item follows one of two routes:

### Route A: Direct to Service Center
1. **Sent to Service Center**: Engineer ships the item directly to the vendor and marks the status in the UI.
2. **Repair Tracking**: Admin/Engineer tracks the vendor's progress.

### Route B: Via Head Office (HO)
1. **Sent to HO**: Engineer ships the item to the Head Office.
2. **Received at HO**: Admin acknowledges receipt.
3. **Sent for Repair from HO**: Admin sends the item to the service center.
4. **Item Repaired at HO**: Admin receives the repaired item back from the vendor and confirms its functional status.

### Returning to Site
1. **Return Shipped to Site**: Admin ships the repaired item back to the original site.
2. **Received at Site**: Engineer confirms receipt of the repaired item at the site.

---

## 3. The Replacement Path (Replacement Stock Workflow)

For `Repair & Replace` requests, a replacement device must be tracked:

1. **Replacement Requisition Raised**: Admin identifies the stock source (`HO Stock`, `Site Stock`, or `Market`) and raises a requisition.
2. **Stock Transfer**: A formal Stock Transfer and Requisition are linked to the RMA.
3. **Replacement Dispatched**: Admin ships the spare part to the site and records tracking details.
4. **Replacement Received at Site**: Engineer confirms receipt. The stock transfer is automatically marked as `Completed`.

---

## 4. Finalization (Installation)

Once a working device (either the repaired one or a replacement) is at the site:

1. **Installation**: The Engineer installs the device.
2. **Update Details**: During installation, the Engineer provides the **final** IP Address, Serial Number, and MAC Address of the installed device.
3. **RMA Completion**:
   - The original asset record in the system is updated with the new hardware details.
   - The RMA status moves to `Installed`.
   - The associated Ticket is marked as `RMA Finalized`.

---

## 5. Status Summary Table

| Status | Description | Role |
| :--- | :--- | :--- |
| `Requested` | RMA request submitted, awaiting approval. | User |
| `Approved` | Admin has approved the request. | Admin |
| `SentToHO` / `SentToServiceCenter` | Faulty item has been dispatched from the site. | Engineer |
| `ReceivedAtHO` | Item reached Head Office. | Admin |
| `SentForRepairFromHO` | Item sent from HO to the vendor. | Admin |
| `ItemRepairedAtHO` | Repaired item is back at HO. | Admin |
| `ReturnShippedToSite` | Repaired/Replacement item is on its way to the site. | Admin |
| `ReceivedAtSite` | Item received by the Engineer at the site. | Engineer |
| `Installed` | Device install confirmed and hardware details updated. | Engineer |

---

## 6. System Integrations
- **Real-time Updates**: Status changes trigger Socket.IO notifications to the room.
- **Email Notifications**: Emails are sent for RMA Creation and key milestones (Approval, Dispatch, etc.).
- **Audit Logs**: All movements are recorded in the `StockMovementLog` and the `DailyWorkLog`.
