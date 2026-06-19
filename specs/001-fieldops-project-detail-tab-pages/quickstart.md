# Quickstart: Project Detail Section Pages

## Validate after implementation

1. Start frontend dev server: `cd frontend && npm run dev`

2. Log in as Admin or Supervisor.

3. Navigate to `/fieldops/projects` → open any active project.

4. **Verify hub page**: No tabs glass-card visible. Section nav grid shows 7 cards
   (Overview, Daily Logs, Devices, Vendor Work, Challenges, Allocated Stock, Survey vs Actual).
   Note: Survey vs Actual card only appears when project has `surveyDeviceRequirements`.

5. **Click each section card** and verify:
   - URL changes to the section-specific path
   - Project name + status + meta visible in header
   - Back link present and returns to hub
   - Section content loads (empty state is OK if no data)

6. **Direct URL access**: Copy a section URL (e.g. `.../daily-logs`) and paste in a new tab.
   Verify it loads without error.

7. **Hero stat card clicks**: Click Efficiency, Deployment, Inventory stats — verify each
   navigates to the correct section page instead of scrolling to a tab.

8. **ESLint**: `cd frontend && npm run lint` — zero new errors.

## Key files changed

- `frontend/src/App.jsx` — 5 new routes + 5 new imports
- `frontend/src/pages/fieldops/ProjectDetail.jsx` — remove tabs; add section nav grid
- `frontend/src/pages/fieldops/ProjectSectionLayout.jsx` — new shared wrapper
- `frontend/src/pages/fieldops/sections/*.jsx` — 5 new section pages
