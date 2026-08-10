# Data Model: Project Detail Section Pages

No new backend models or schema changes required.

## Component Props

### ProjectSectionLayout

```
Props:
  sectionTitle: string       // e.g. "Daily Logs"
  sectionIcon: ReactNode     // lucide-react icon component

Internal state:
  project: object | null     // fetched from fieldOpsApi.getProjectById(id)
  dashboard: object | null   // fetched from fieldOpsApi.getProjectDashboard(id)
  loading: boolean

Route param consumed:
  id (from useParams)        // project ID

Children: React.ReactNode    // section-specific content
```

### Section Pages — common pattern

```
Props: none (all data from useParams + internal fetch)

Route param consumed:
  id (or projectId)          // project ID
```

### Section Nav Card (inline in ProjectDetail)

```
Props:
  to: string                 // link href
  icon: ReactNode
  label: string
  count: number | string
  highlight?: boolean        // true for cards with open issues (red count)
```

## API endpoints used (no changes)

| Section           | API call                                                    |
|-------------------|-------------------------------------------------------------|
| ProjectSectionLayout | fieldOpsApi.getProjectById(id)                           |
| ProjectSectionLayout | fieldOpsApi.getProjectDashboard(id)                      |
| DailyLogsSection  | fieldOpsApi.getPMDailyLogs({ projectId })                   |
| DevicesSection    | (uses dashboard.allocations + dashboard.devices from layout)|
| VendorWorkSection | (uses dashboard.vendorWork from layout)                     |
| ChallengesSection | fieldOpsApi.getChallengeLogs({ projectId }) — no limit:5   |
| OverviewSection   | (uses project data from layout — no extra fetch)            |
