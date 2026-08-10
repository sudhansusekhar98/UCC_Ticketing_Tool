# Route Contracts: FieldOps Project Activities (Frontend)

## New frontend routes (add to App.jsx)

All use: `allowedRoles={['Admin', 'Supervisor']}`, `requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}`

| Path | Component | Description |
|------|-----------|-------------|
| `/fieldops/projects/:id/activities` | `ProjectActivitiesSection` | Activities list for a project |
| `/fieldops/projects/:id/activities/new` | `ActivityForm` | Create activity |
| `/fieldops/activities/:activityId` | `ActivityDetail` | View/manage single activity |
| `/fieldops/activities/:activityId/edit` | `ActivityForm` | Edit activity |

## New component files

```text
frontend/src/pages/fieldops/
├── sections/
│   └── ProjectActivitiesSection.jsx   (new — list, filter, status quick-change)
├── activities/
│   ├── ActivityForm.jsx               (new — create/edit, task templates)
│   └── ActivityDetail.jsx             (new — detail view, inline task toggle)
```

## Modified files

```text
frontend/src/
├── App.jsx                            (add 4 routes + 3 imports)
├── services/api.js                    (add 10 activity API methods to fieldOpsApi)
├── pages/fieldops/ProjectDetail.jsx   (add "Activities" card to section nav grid)
└── pages/fieldops/pm-logs/
    └── PMDailyLogForm.jsx             (add "Activities Worked Today" section)
```
