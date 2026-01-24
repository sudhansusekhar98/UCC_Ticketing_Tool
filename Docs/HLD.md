
# 📘 HIGH LEVEL DESIGN (HLD)

## 1. System Overview

The system is a centralized **TicketOps - Ticketing & Maintenance Platform** used to:

* Monitor surveillance infrastructure health
* Automatically generate tickets from alarms
* Manage field maintenance operations
* Enforce SLAs and escalation
* Provide operational analytics for command centers

It supports **real-time incident handling**, **planned maintenance**, and **audit-compliant reporting**.

---

## 2. Architectural Style

**Hybrid Monolith → Event-Driven Modular Architecture**

* Core business logic: Modular Monolith (fast delivery)
* Integrations & alerts: Event-driven via Message Broker
* Scalable to microservices later without redesign

---

## 3. High-Level Architecture Components

### 3.1 Presentation Layer

* **Web Application**

  * Dispatcher dashboard
  * Supervisor & Admin console
  * Client read-only portal
* **Mobile Application**

  * Field engineers
  * Offline support
  * Geo-tagged evidence capture

---

### 3.2 Application Layer (Backend)

| Service              | Responsibility                    |
| -------------------- | --------------------------------- |
| Ticket Service       | Ticket lifecycle, SLA, escalation |
| Asset Service        | Cameras, NVRs, network devices    |
| Work Order Service   | Field execution & checklists      |
| Integration Service  | VMS, NMS, IoT ingestion           |
| Notification Service | SMS, Email, WhatsApp              |
| Reporting Service    | KPIs, SLA, uptime                 |
| Auth Service         | RBAC, JWT, MFA                    |

---

### 3.3 Integration Layer

* VMS (Genetec / Milestone)
* Network Monitoring (Zabbix / SNMP)
* IoT (MQTT)
* Message Broker (RabbitMQ)

---

### 3.4 Data Layer

* SQL Server (Transactional data)
* Redis (Cache + locks)
* Object Storage (Images, videos)
* Elasticsearch (Search & analytics – optional)

---

## 4. Technology Stack (Finalized)

| Layer           | Technology              |
| --------------- | ----------------------- |
| Frontend        | React / Angular         |
| Backend         | ASP.NET Core (.NET 8)   |
| DB              | MS SQL Server           |
| ORM             | Entity Framework Core   |
| Messaging       | RabbitMQ                |
| Cache           | Redis                   |
| Background Jobs | Hangfire                |
| Realtime        | SignalR                 |
| Storage         | Azure Blob / S3 / MinIO |
| Auth            | Azure AD / Keycloak     |
| Logs            | OpenTelemetry + ELK     |

---

## 5. User Roles (RBAC)

| Role          | Capabilities                    |
| ------------- | ------------------------------- |
| Dispatcher    | Create, assign, monitor tickets |
| L1 Engineer   | Acknowledge & basic fixes       |
| L2 Engineer   | Advanced troubleshooting        |
| Supervisor    | SLA, escalation, approvals      |
| Admin         | Config, users, policies         |
| Client Viewer | Read-only dashboards            |

---

## 6. Ticket Lifecycle (HLD View)

```
Alarm / Manual
      ↓
Ticket Created
      ↓
Assigned
      ↓
Acknowledged
      ↓
In-Progress
      ↓
Resolved
      ↓
Verified
      ↓
Closed
```

Escalations trigger automatically based on SLA timers.

---

## 7. Non-Functional Requirements

* High availability (99.9%)
* Horizontal scalability
* Audit compliance
* Secure evidence storage
* Near real-time updates (<2 sec)

---

# 📕 LOW LEVEL DESIGN (LLD)

---

## 1. Database Design (Core Tables)

### 1.1 AssetMaster

```sql
AssetId (PK)
AssetType (Camera/NVR/Switch)
MakeModel
SerialNumber
IPAddress
MacAddress
SiteId
Criticality
WarrantyEndDate
VmsReferenceId
IsActive
```

---

### 1.2 SiteMaster

```sql
SiteId (PK)
City
Zone
Ward
LocationName
Latitude
Longitude
```

---

### 1.3 TicketMaster

```sql
TicketId (PK)
AssetId (FK, nullable)
Category
SubCategory
Priority
Status
CreatedOn
CreatedBy
AssignedTo
SLAResponseDue
SLARestoreDue
RootCause
ResolutionSummary
```

---

### 1.4 TicketAuditTrail

```sql
AuditId (PK)
TicketId (FK)
Action
OldValue
NewValue
PerformedBy
PerformedOn
```

---

### 1.5 WorkOrder

```sql
WorkOrderId (PK)
TicketId (FK)
EngineerId
ChecklistJson
PartsUsedJson
Remarks
StartedOn
CompletedOn
```

---

### 1.6 SLA_Policy

```sql
PolicyId (PK)
Priority
ResponseMinutes
RestoreMinutes
EscalationLevel1
EscalationLevel2
```

---

## 2. Priority Calculation Logic

```text
Priority Score =
Impact (1–5) × Urgency (1–5) × Asset Criticality (1–3)
```

| Score | Priority      |
| ----- | ------------- |
| ≥ 50  | P1 – Critical |
| 25–49 | P2 – High     |
| 10–24 | P3 – Medium   |
| <10   | P4 – Low      |

---

## 3. Alarm → Ticket Creation Flow (LLD)

1. Alarm received from VMS/NMS
2. Message pushed to RabbitMQ
3. Integration Service consumes message
4. Correlation logic checks:

   * Same asset
   * Same fault
   * Time window
5. If exists → update ticket
   Else → create new ticket
6. SLA timers calculated
7. Dispatcher notified via SignalR

---

## 4. SLA & Escalation Logic

### Background Job (Hangfire)

* Runs every 1 minute
* Checks:

  * Response SLA breach
  * Restore SLA breach
* Triggers escalation:

  * Email / SMS
  * Supervisor reassignment
  * Severity upgrade

---

## 5. Work Order Execution (Mobile)

1. Engineer accepts ticket
2. Checklist auto-loads based on asset type
3. Photos/videos captured
4. Evidence uploaded (background sync)
5. Resolution submitted
6. Supervisor verification required (optional)

---

## 6. Security Design

* JWT tokens with role claims
* API authorization filters
* Evidence access via signed URLs
* Immutable audit trail
* Admin actions fully logged

---

## 7. Reporting KPIs

* Asset uptime %
* MTTR / MTBF
* SLA compliance %
* Ticket aging
* Engineer productivity
* Repeat fault analysis

---

## 8. Deployment Model

* API: IIS / Docker / AKS
* DB: SQL Server HA
* Broker: RabbitMQ cluster
* Storage: Object storage with lifecycle rules

---

## 9. Future Enhancements (Designed-In)

* AI-based fault prediction
* Topology visualization (network + cameras)
* Automated spare forecasting
* City-wise multi-tenant isolation

---

# ✅ Final Outcome

This design:

* Matches **TicketOps command center operations**
* Handles **high alarm volume**
* Is **audit-safe and SLA-driven**
* Can scale from **single city → multi-city**

---

### Next steps (you choose):

1. Convert this into **HLD & LLD DOCX / PDF**
2. Create **API contracts (Swagger-level)**
3. Provide **ER diagram**
4. Prepare **project folder structure + starter code**
5. Create **ticket priority & SLA config UI design**

Frontend Framework Preference: Would you like React or Angular for the frontend? 
Frontend: React

Scope of MVP: Would you like me to build:
Option A: Full-stack application (MS SQL Express + React frontend)

Initial Modules: Which modules should I prioritize first?
All
Database Setup: MS SQL Express installed in Local system

Authentication: Would you like:
Simple JWT-based auth (built-in)
