# Route Contracts: Project Detail Section Pages

## New routes (5 additions to App.jsx)

All use: `allowedRoles={['Admin', 'Supervisor']}`, `requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}`

| Path                                          | Component                  | Param name  |
|-----------------------------------------------|----------------------------|-------------|
| /fieldops/projects/:id/overview               | ProjectOverviewSection     | id          |
| /fieldops/projects/:id/daily-logs             | ProjectDailyLogsSection    | id          |
| /fieldops/projects/:id/devices                | ProjectDevicesSection      | id          |
| /fieldops/projects/:id/vendor-work            | ProjectVendorWorkSection   | id          |
| /fieldops/projects/:id/challenges             | ProjectChallengesSection   | id          |

## Existing routes reused (section nav cards link to these)

| Path                                          | Existing Component              |
|-----------------------------------------------|---------------------------------|
| /fieldops/projects/:projectId/stock           | ProjectAllocatedStockList       |
| /fieldops/projects/:projectId/reconciliation  | SurveyReconciliation            |

## Modified hub route

| Path                         | Component      | Change                                      |
|------------------------------|----------------|---------------------------------------------|
| /fieldops/projects/:id       | ProjectDetail  | Remove tabs; add section nav grid + links   |

## Component file locations

```
frontend/src/pages/fieldops/
├── ProjectDetail.jsx                    (modified)
├── ProjectSectionLayout.jsx             (new)
└── sections/
    ├── ProjectOverviewSection.jsx       (new)
    ├── ProjectDailyLogsSection.jsx      (new)
    ├── ProjectDevicesSection.jsx        (new)
    ├── ProjectVendorWorkSection.jsx     (new)
    └── ProjectChallengesSection.jsx     (new)
```
