# TicketOps — Features by Module

Full-stack IT ticketing & asset management system (Express/MongoDB backend, React 19/Vite frontend, Socket.IO real-time).

## 1. Authentication & Access Control
- Role-based login (Admin, Supervisor, Dispatcher, L1/L2 Engineer, SiteClient, ClientViewer) with JWT access + refresh tokens
- Self-service client sign-up with admin approval/rejection workflow (`clientRegistration`)
- Password change, profile picture upload, per-user preferences (theme, etc.)
- Granular per-site permission rights (`user-rights`) layered on top of roles
- Session auto-expiry (6 hours) with periodic client-side checks; heartbeat-based online/active user tracking

**Benefit:** Fine-grained, auditable access so each role only sees/does what it should, while letting external clients self-onboard under admin control.

## 2. Ticket Management
- Full ticket lifecycle: create → assign → acknowledge → start → hold/resume → resolve → verify/reject → close/reopen
- SLA tracking with breach detection, extension requests, and approve/reject workflow
- Escalation chain (L1/L2/L3) with accept-escalation flow
- Audit trail per ticket, activity/attachment logging, cable and stock usage panels on tickets
- Dashboard stats and ticket trend charts

**Benefit:** Enforces a consistent, auditable support workflow with SLA accountability and escalation paths, reducing tickets falling through the cracks.

## 3. Asset Management
- Asset CRUD with bulk import/export (CSV/Excel templates), status bulk-update, and live ping/status checks with progress tracking
- Encrypted credential storage (AES-256-GCM) for sensitive asset fields, rate-limited retrieval
- Asset-update requests via token-based external link (site client can submit changes for admin approval)
- RMA (Return Merchandise Authorization) tracking tied to assets/tickets, with replacement history

**Benefit:** Centralized, secure inventory of IT/CCTV hardware with a controlled change process even for non-portal users.

## 4. Site Management
- Site CRUD, dropdown/city lookups
- Per-site SLA policy configuration (global + site-level override)

**Benefit:** Localized SLA and asset scoping per physical location/client site.

## 5. Stock & Inventory
- Inventory tracking, bulk add/upload, template-based import, movement logs & stats
- Stock replacement workflow tied to tickets, cable stock & usage recording per ticket
- Requisitions (approve/fulfill/reject) and inter-site transfers (dispatch/receive)
- Project-based stock allocation (for field-ops projects), cable allocation tracking
- Stock analytics dashboard

**Benefit:** End-to-end spares/consumables control — from procurement to field usage — with full traceability and approval gates.

## 6. Field Operations (CCTV/Surveillance Projects)
- **Projects**: auto-ID'd (`PRJ-YYYYMMDD-XXXX`) projects with assigned PM, team members, vendors, linked site, zones (GPS-bounded)
- **PM Daily Logs**: end-of-day submissions with GPS capture, photo upload, 24-hour edit lock + admin unlock, auto-lock cron
- **Device Installations**: IP camera/NVR/DVR/PTZ tracking, bulk create/assign, cable & network details, status updates, config skip
- **Vendor Work Logs**: road-digging/cable-laying tracking with GPS area and trench status
- **Challenge Logs**: issue tracking with severity, admin escalation, comment threads, resolution
- **Survey Reconciliation**: compares survey requirements vs actual device installations; device-mapping configuration for unmapped items
- **Activities**: task-based activity tracking per project with sub-tasks and status
- **Project Reports**: PDF/Excel export, project dashboard

**Benefit:** Purpose-built project management for physical installation work, replacing spreadsheets with GPS-verified, photo-backed, time-locked daily accountability.

## 7. User & Organization Management
- User CRUD, activate/deactivate, admin-triggered password reset
- Org chart visualization
- Engineer/contact/escalation-user lookups for assignment pickers
- Live "active users" / online presence via heartbeat

**Benefit:** Clear staffing visibility and fast assignee lookup during ticket triage.

## 8. Notifications
- In-app notification center (list, mark read/all-read, delete)
- Admin-authored broadcast notifications, delivery logs
- Real-time push via Socket.IO rooms (`user_{id}`, `ticket_{id}`)
- Polling fallback for environments without WebSocket support (e.g. serverless)

**Benefit:** Users stay informed in real time without needing to poll manually, with graceful degradation on restrictive networks.

## 9. Reporting & Analytics
- Ticket, SLA, asset, and RMA statistics
- Exportable reports: employee status, asset status, RMA, spare stock, work activity, user activities — both as downloadable files and styled HTML views
- Dashboard analytics: KPI cards, SLA overview, category/priority/status/trend charts, sparklines

**Benefit:** Management gets ready-made, exportable operational reports without needing a separate BI tool.

## 10. Work Logs
- Personal daily work log with manual entries + attachments, daily summary
- Team/user log views for Admin/Supervisor oversight

**Benefit:** Lightweight timesheet/activity record for field and support staff, visible to supervisors for accountability.

## 11. Settings & Configuration
- Category-based system settings (get/update single setting)
- Global and per-site SLA policy configuration
- Lookup/reference data endpoints (statuses, priorities, categories, asset/device types, roles, models) — cached client-side for fast form rendering

**Benefit:** Centralized, admin-editable configuration instead of hardcoded values, so operational rules can change without a deployment.

## 12. Background Jobs (cron)
- SLA breach monitoring (every minute)
- PM daily log reminder (7 PM daily)
- Auto-lock of PM daily logs after 24 hours (hourly)

**Benefit:** Deadline and compliance enforcement happens automatically, without manual follow-up.

---

### Cross-cutting technical features
- Real-time updates via Socket.IO with polling fallback
- Audit logging middleware on mutating requests
- Rate limiting on auth and sensitive endpoints
- AES-256-GCM encryption for sensitive asset data
- React Query for server-state caching, Zustand for auth/UI/theme state
- Light/dark/system theme support
