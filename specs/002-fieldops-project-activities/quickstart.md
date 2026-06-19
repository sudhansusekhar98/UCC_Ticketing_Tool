# Quickstart: FieldOps Project Activities

## Validate after implementation

### Backend
```bash
cd backend-express && npm run dev
```

1. **Create an activity**:
   ```
   POST /api/fieldops/projects/:projectId/activities
   Body: { title, type: "Technical", leadEngineer: <userId>, tasks: ["Mount camera", "Configure IP"] }
   → 201 with activityNumber ACT-YYYYMMDD-XXXX
   ```

2. **Get prefill for daily log**:
   ```
   GET /api/fieldops/projects/:projectId/daily-log/prefill
   → Array of open activities with tasks
   ```

3. **Submit daily log with activity entries**:
   ```
   POST /api/fieldops/pm-logs
   Body includes activityEntries array
   → 201 with log including activityEntries
   ```

### Frontend
```bash
cd frontend && npm run dev
```

**Activity creation (US1)**:
1. Log in as Admin/Supervisor
2. Open any active project → click "Activities" section card
3. Click "New Activity" → fill Title, Type=Technical
4. Change type → task template chips appear → click chips to add tasks
5. Set planned start/end dates for the activity and individual task deadlines
6. Save → activity appears in list with status **ToDo**

**Daily log with activity (US2)**:
1. Open project → "Submit Daily Log"
2. Scroll to "Activities Worked Today" → open activities appear
3. Check the activity → task list expands
4. Leave an overdue task unchecked → try to save → validation error appears
5. Enter delay reason → save succeeds
6. Navigate to the activity detail → linked log entry shows today's date

**Activity list (US3)**:
1. Open project → Activities section
2. Multiple activities visible with status badges
3. Click status badge on one → dropdown → change to InProgress → updates immediately

**ESLint**:
```bash
cd frontend && npm run lint
```
Zero new errors in new/modified files.

## Key files

| File | Change |
|------|--------|
| `backend-express/models/Activity.model.js` | Add `plannedEnd` to `activityTaskSchema` |
| `backend-express/models/PMDailyLog.model.js` | Add `activityEntries` subdoc + index |
| `backend-express/controllers/fieldops.controller.js` | Handle `activityEntries` in create/update log |
| `frontend/src/services/api.js` | Add 10 activity API methods |
| `frontend/src/pages/fieldops/ProjectDetail.jsx` | Add Activities card to section nav |
| `frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx` | Add activity entry section |
| `frontend/src/pages/fieldops/sections/ProjectActivitiesSection.jsx` | New |
| `frontend/src/pages/fieldops/activities/ActivityForm.jsx` | New |
| `frontend/src/pages/fieldops/activities/ActivityDetail.jsx` | New |
| `frontend/src/App.jsx` | Add 4 routes + imports |
