# API Contracts: FieldOps Project Activities

All routes require JWT via `Authorization: Bearer <token>`.
All routes use `allowAccess({ roles: ['Admin', 'Supervisor'], right: 'PROJECT_MANAGEMENT_PORTAL' })`
unless noted otherwise.

## Already-implemented routes (no changes needed)

| Method | Path | Controller |
|--------|------|-----------|
| GET | `/api/fieldops/activities/task-suggestions?type=` | `getActivityTaskSuggestions` |
| GET | `/api/fieldops/projects/:projectId/activities` | `getProjectActivities` |
| POST | `/api/fieldops/projects/:projectId/activities` | `createProjectActivity` |
| GET | `/api/fieldops/projects/:projectId/daily-log/prefill` | `getDailyLogPrefill` |
| GET | `/api/fieldops/activities/:id` | `getProjectActivityById` |
| PUT | `/api/fieldops/activities/:id` | `updateProjectActivity` |
| PATCH | `/api/fieldops/activities/:id/status` | `updateProjectActivityStatus` |
| DELETE | `/api/fieldops/activities/:id` | `deleteProjectActivity` |
| POST | `/api/fieldops/activities/:id/tasks` | `addProjectActivityTask` |
| PATCH | `/api/fieldops/activities/:id/tasks/:taskId` | `updateProjectActivityTask` |
| DELETE | `/api/fieldops-activities/:id/tasks/:taskId` | `deleteProjectActivityTask` |

## Routes requiring backend change

### `POST /api/fieldops/pm-logs` (createPMDailyLog)
### `PUT /api/fieldops/pm-logs/:id` (updatePMDailyLog)

**Change**: Accept `activityEntries` array in request body.

**Request body addition**:
```json
{
  "activityEntries": [
    {
      "activityId": "664abc123...",
      "activityTitle": "Install IP Cameras — Block A",
      "tasksWorked": [
        {
          "taskId": "664def456...",
          "taskTitle": "Mount device at designated location",
          "completed": true,
          "delayReason": ""
        },
        {
          "taskId": "664def789...",
          "taskTitle": "Run and terminate cable",
          "completed": false,
          "delayReason": "Cable delivery delayed by 2 days"
        }
      ],
      "progressNote": "Mounted 4 of 6 cameras in Zone A"
    }
  ]
}
```

**Response**: Same as current — the full saved log document, now including `activityEntries`.

---

## Frontend `api.js` additions (new methods in `fieldOpsApi`)

```js
// Activities
getProjectActivities: (projectId, params) =>
  api.get(`/fieldops/projects/${projectId}/activities`, { params }),

getActivityById: (id) =>
  api.get(`/fieldops/activities/${id}`),

createActivity: (projectId, data) =>
  api.post(`/fieldops/projects/${projectId}/activities`, data),

updateActivity: (id, data) =>
  api.put(`/fieldops/activities/${id}`, data),

updateActivityStatus: (id, status) =>
  api.patch(`/fieldops/activities/${id}/status`, { status }),

deleteActivity: (id) =>
  api.delete(`/fieldops/activities/${id}`),

addActivityTask: (id, title) =>
  api.post(`/fieldops/activities/${id}/tasks`, { title }),

updateActivityTask: (id, taskId, data) =>
  api.patch(`/fieldops/activities/${id}/tasks/${taskId}`, data),

deleteActivityTask: (id, taskId) =>
  api.delete(`/fieldops/activities/${id}/tasks/${taskId}`),

getActivityTaskSuggestions: (type) =>
  api.get('/fieldops/activities/task-suggestions', { params: { type } }),

getDailyLogPrefill: (projectId) =>
  api.get(`/fieldops/projects/${projectId}/daily-log/prefill`),
```
