# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TicketOps is a full-stack IT ticketing and asset management system with:
- **Backend**: Express.js + MongoDB (Mongoose ODM) + Socket.IO for real-time updates
- **Frontend**: React 19 + Vite + Zustand + React Query + React Router 7

The system manages tickets, assets, sites, users, SLA policies, stock inventory, RMA requests, work orders, and field operations (CCTV/surveillance installation projects).

## Development Commands

### Running Both Services
```bash
# Terminal 1: Backend
cd backend-express && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Backend (`backend-express/`)
```bash
npm run dev          # Start with nodemon (auto-reload)
npm start            # Production start
npm run seed         # Seed database with initial data (users, SLA policies)
npm run seed:full    # Full database seed
npm run migrate      # Migrate from SQL Server to MongoDB
```

### Frontend (`frontend/`)
```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Architecture

### Backend Structure
- `server.js` - Express app entry point, middleware setup, route mounting
- `config/database.js` - MongoDB connection (supports Vercel serverless)
- `routes/*.routes.js` - Route definitions (auth, tickets, assets, sites, users, stock, etc.)
- `controllers/*.controller.js` - Business logic
- `models/*.model.js` - Mongoose schemas with indexes and virtuals
- `middleware/auth.middleware.js` - JWT verification and role-based authorization
- `cron-jobs.js` - Background SLA monitoring, PM daily log reminders, auto-lock expired logs

### Field Operations Module (`/api/fieldops`)
Manages CCTV/surveillance installation projects with:
- **Projects**: Project entity with `PRJ-YYYYMMDD-XXXX` auto-IDs, assignedPM, teamMembers, linkedSiteId
- **Project Zones**: Site zones with GPS boundary points
- **PM Daily Logs**: End-of-day submissions with 24-hour lock mechanism, GPS capture, photo uploads
- **Device Installations**: Device tracking (IP Camera, NVR, DVR, PTZ) with cable/network details
- **Vendor Work Logs**: Road digging, cable laying, GPS area tracking, trench status
- **Challenge Logs**: Issue tracking with severity levels and admin escalation

### Frontend Structure
- `src/App.jsx` - Route definitions with `ProtectedRoute` wrapper for auth/role checks
- `src/context/authStore.js` - Zustand store for auth state (JWT tokens, user, rights)
- `src/context/cacheStore.js` - Zustand store for static data caching
- `src/services/api.js` - Axios instance with interceptors for auth tokens
- `src/services/socket.js` - Socket.IO client for real-time updates
- `src/constants/permissions.js` - Permission constants (PERMISSIONS.*)
- `src/pages/` - Page components organized by feature
- `src/pages/fieldops/` - Field operations (projects, devices, vendor logs, challenges, reports)
- `src/components/` - Shared UI components

### Key Data Flow
1. Auth: JWT tokens stored in Zustand (persisted to localStorage) + automatic 6-hour session expiry
2. API: Axios interceptor attaches Bearer token to requests, handles 401 refresh
3. Real-time: Socket.IO emits events for ticket updates, notifications
4. State: React Query for server state, Zustand for auth/UI state

## Code Patterns

### Backend Models
- Mongoose schemas with validation, indexes, and virtual relationships
- Pre-save hooks for auto-generating IDs (e.g., `TKT-YYYYMMDD-XXXX`)
- Export named constants for enums (e.g., `TicketStatuses`, `TicketPriorities`)

### Backend Routes Pattern
```javascript
import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/', protect, controller.getAll);
router.post('/', protect, authorize('Admin', 'Supervisor'), controller.create);
export default router;
```

### Frontend Auth Pattern
```javascript
import useAuthStore from '../context/authStore';
const { hasRole, hasRight, hasRightForAnySite, getSitesWithRight } = useAuthStore();
if (hasRole(['Admin', 'Supervisor'])) { /* ... */ }
if (hasRight('ManageAssets', siteId)) { /* ... */ }
```

### Protected Route Pattern
Routes use `<ProtectedRoute allowedRoles={[...]} requiredRight={PERMISSIONS.X}>` to enforce access.

### Field Operations Access Control
Field ops uses assignment-based access (no new roles needed):
- `assignedPM` - User assigned as Project Manager
- `teamMembers` - Array of user IDs with project access
- `assignedVendors` - Array of user IDs for vendor work
- Helper functions in controller: `canAccessProject()`, `isAssignedPM()`, `isAssignedVendor()`

## User Roles
- `Admin` - Full system access
- `Supervisor` - Team oversight, most management functions
- `Dispatcher` - Ticket management and assignment
- `L1Engineer` / `L2Engineer` - Field work, ticket handling
- `SiteClient` / `ClientViewer` - Limited client access

## Environment Configuration

Backend requires `.env` (copy from `.env.example`):
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - JWT signing keys
- `ENCRYPTION_KEY` - AES-256-GCM key for sensitive data (64 hex chars)
- `CLOUDINARY_*` - Image upload credentials
- `SMTP_*` - Email notification settings

## Real-Time Events
Socket.IO rooms: `user_{userId}` for user notifications, `ticket_{ticketId}` for ticket-specific updates.

## Background Jobs (cron-jobs.js)
- SLA monitoring - checks ticket SLA breaches every minute
- PM Daily Log reminder - sends notification at 7 PM daily
- Auto-lock logs - locks PM daily logs after 24 hours (hourly check)

## Deployment
- Backend: Vercel serverless (uses `api/index.js` entry point)
- Frontend: Vercel static hosting
- Database: MongoDB Atlas
