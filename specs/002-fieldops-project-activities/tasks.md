---
description: "Task list for FieldOps Project Activities feature"
---

# Tasks: FieldOps Project Activities

**Input**: Design documents from `specs/002-fieldops-project-activities/`

**Prerequisites**: plan.md âœ… spec.md âœ… research.md âœ… data-model.md âœ… contracts/ âœ…

**Tests**: Not requested â€” no test tasks generated.

**Key context**: Backend Activity CRUD (model + controller + routes) is already fully implemented.
This feature patches 2 backend models + 1 controller, then builds all frontend from scratch.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to spec.md user story (US1, US2, US3, US4)
- Exact file paths in every task

---

## Phase 1: Setup

**Purpose**: Create directories for new frontend component files.

- [X] T001 Create directory `frontend/src/pages/fieldops/activities/` for ActivityForm and ActivityDetail components

**Checkpoint**: Directory exists â†’ ready to create activity page files

---

## Phase 2: Foundational â€” Shared API layer + backend model patch

**Purpose**: Backend and API service foundations that ALL user stories depend on.
Both tasks can run in parallel (different files).

- [X] T002 [P] Add 10 activity API methods to `frontend/src/services/api.js` inside the `fieldOpsApi` object â€” add after the last existing fieldOpsApi method:
  ```js
  getProjectActivities: (projectId, params) => api.get(`/fieldops/projects/${projectId}/activities`, { params }),
  getActivityById: (id) => api.get(`/fieldops/activities/${id}`),
  createActivity: (projectId, data) => api.post(`/fieldops/projects/${projectId}/activities`, data),
  updateActivity: (id, data) => api.put(`/fieldops/activities/${id}`, data),
  updateActivityStatus: (id, status) => api.patch(`/fieldops/activities/${id}/status`, { status }),
  deleteActivity: (id) => api.delete(`/fieldops/activities/${id}`),
  addActivityTask: (id, title) => api.post(`/fieldops/activities/${id}/tasks`, { title }),
  updateActivityTask: (id, taskId, data) => api.patch(`/fieldops/activities/${id}/tasks/${taskId}`, data),
  deleteActivityTask: (id, taskId) => api.delete(`/fieldops/activities/${id}/tasks/${taskId}`),
  getActivityTaskSuggestions: (type) => api.get('/fieldops/activities/task-suggestions', { params: { type } }),
  getDailyLogPrefill: (projectId) => api.get(`/fieldops/projects/${projectId}/daily-log/prefill`),
  ```

- [X] T003 [P] Add `plannedEnd: { type: Date }` field to `activityTaskSchema` in `backend-express/models/Activity.model.js` â€” insert after the `notes` field (around line 27)

**Checkpoint**: API methods exist in api.js and Activity model has plannedEnd field â€” blocks all frontend pages

---

## Phase 3: User Story 1 â€” Create and Manage a Project Activity (Priority: P1) ðŸŽ¯ MVP

**Goal**: PM/Admin can create activities with sub-tasks, required devices, and planned dates.
Activities appear in a filterable list on the project page.

**Independent Test**: Open a project â†’ click Activities section card â†’ click "New Activity" â†’
fill title + type=Technical + lead engineer + 2 tasks â†’ save â†’ activity listed with status **ToDo**
and activityNumber like `ACT-20260513-0001`.

### Implementation for User Story 1

- [X] T004 [P] [US1] Create `frontend/src/pages/fieldops/sections/ProjectActivitiesSection.jsx`:
  - Use `ProjectSectionLayout` wrapper with `sectionTitle="Activities"` and `sectionIcon={<Activity size={16} />}`
  - Local state: `activities`, `loading`, `filterStatus` ('all'), `filterType` ('all')
  - On mount: `fieldOpsApi.getProjectActivities(id)` â†’ `setActivities(res.data.data || [])`
  - Filter bar (inline, below section title): two `<select>` elements â€” status (All/ToDo/InProgress/Review/Done/Blocked) and type (All/Technical/Construction/Maintenance)
  - "New Activity" button: `<Link to={/fieldops/projects/${id}/activities/new}>` (visible to all users with access)
  - Activity list: `activities.filter(a => filterStatus==='all'||a.status===filterStatus).filter(a => filterType==='all'||a.type===filterType)`
  - Each activity card (glass-card style, clickable â†’ navigate to `/fieldops/activities/${a._id}`):
    - Top row: `a.activityNumber` chip (small, muted) + `a.title` (bold) + type badge (color-coded: Technical=blue, Construction=amber, Maintenance=purple) + priority dot (High=red, Med=yellow, Low=green)
    - Middle row: status `<select>` (stops propagation, calls `fieldOpsApi.updateActivityStatus(a._id, newStatus)` then updates local state) + lead engineer name + planned dates (`a.plannedStart` â†’ `a.plannedEnd`)
    - Progress bar: `a.progressPercentage`% + task count chip (`a.tasks.length` tasks, `a.tasks.filter(t=>t.done).length` done)
  - Empty state: if no activities â†’ "No activities yet" + New Activity button
  - Imports: useParams, useState, useEffect, Link, useNavigate, fieldOpsApi, toast, format (date-fns), ProjectSectionLayout, Activity + other lucide icons, fieldops.css

- [X] T005 [P] [US1] Create `frontend/src/pages/fieldops/activities/ActivityForm.jsx`:
  - Reads `projectId` from `useParams()` (create mode when URL is `/projects/:id/activities/new`) OR `activityId` (edit mode via `/activities/:activityId/edit`)
  - Detect edit mode: `const isEditing = Boolean(activityId)` â€” if editing, fetch `fieldOpsApi.getActivityById(activityId)` and pre-fill form
  - Form state: `{ title, description, type: 'Technical', priority: 'Med', leadEngineer: '', assignees: [], plannedStart: '', plannedEnd: '', tasks: [] }`
  - On type change: call `fieldOpsApi.getActivityTaskSuggestions(newType)` â†’ render chips; clicking a chip pushes `{ title: chip, plannedEnd: '' }` to `tasks` array if not already present
  - Task list section: each task row has: drag handle (visual only), text input for `title`, date input for `plannedEnd`, remove button (Ã—)
  - "Add Task" button: pushes `{ title: '', plannedEnd: '' }` to tasks
  - leadEngineer: text input with placeholder "User ID or name" â€” keep simple (no autocomplete required in MVP)
  - assignees: comma-separated user ID text input (split on save)
  - Required Devices section: list of `{ deviceTypeName, qty }` rows with add/remove
  - Required Stock section: list of `{ itemName, qty }` rows with add/remove
  - On submit: validate `title` and `leadEngineer` non-empty; call `createActivity(effectiveProjectId, formData)` or `updateActivity(activityId, formData)` â†’ navigate to `/fieldops/activities/${savedActivity._id}`
  - Header: back link to activities list, `h1` "New Activity" or "Edit Activity"
  - Imports: useState, useEffect, useParams, useNavigate, Link, fieldOpsApi, toast, ArrowLeft, Plus, X, fieldops.css

- [X] T006 [P] [US1] Create `frontend/src/pages/fieldops/activities/ActivityDetail.jsx`:
  - Reads `activityId` from `useParams()`
  - Fetch on mount: `fieldOpsApi.getActivityById(activityId)` â†’ `setActivity(res.data.data)`
  - Header: back link to `/fieldops/projects/${activity.projectId._id}/activities`, activity number chip, title, status `<select>` (calls `updateActivityStatus`), Edit button (â†’ `/fieldops/activities/${activityId}/edit`), Delete button (confirm â†’ `deleteActivity` â†’ navigate back)
  - Meta strip (one row): type badge + priority dot + lead engineer + planned dates + progress % value
  - Progress bar: `activity.progressPercentage`%
  - Sub-tasks section (glass-card):
    - Header: "Sub-Tasks" + `done/total` badge
    - Each task row: checkbox (calls `fieldOpsApi.updateActivityTask(activityId, task._id, { done: !task.done })`), task title, deadline chip (`task.plannedEnd` â€” red if overdue+not done, green if done, gray if no deadline), `task.doneBy?.fullName` (shown when done), `task.notes` (small, muted)
    - Add task row at bottom: text input + Enter/button â†’ `fieldOpsApi.addActivityTask(activityId, newTitle)` â†’ re-fetch
  - Required Resources section (glass-card): two columns â€” Required Devices list + Required Stock list (read-only pills)
  - Timeline section: 2Ã—2 grid â€” Planned Start, Planned End, Actual Start, Actual End
  - Imports: useState, useEffect, useParams, useNavigate, Link, fieldOpsApi, toast, format, formatDistanceToNow, lucide icons, fieldops.css

- [X] T007 [US1] Add "Activities" section card to `frontend/src/pages/fieldops/ProjectDetail.jsx`:
  - Add `Activity` to the lucide-react import list at the top of the file
  - In the section nav grid, add a new `<SectionCard>` after the "Daily Logs" card:
    ```jsx
    <SectionCard
      to={`/fieldops/projects/${id}/activities`}
      icon={<Activity size={22} />}
      label="Activities"
    />
    ```
  - No count badge needed (dashboard doesn't expose activity count yet)

- [X] T008 [US1] Add 4 new routes and 3 new imports to `frontend/src/App.jsx`
  (depends on T004, T005, T006 files existing):
  - Add imports after the existing fieldops section imports:
    ```js
    import ProjectActivitiesSection from './pages/fieldops/sections/ProjectActivitiesSection';
    import ActivityForm from './pages/fieldops/activities/ActivityForm';
    import ActivityDetail from './pages/fieldops/activities/ActivityDetail';
    ```
  - Add 4 routes after the existing `/fieldops/projects/:id/challenges` route:
    ```jsx
    <Route path="/fieldops/projects/:id/activities"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ProjectActivitiesSection />
      </ProtectedRoute>} />
    <Route path="/fieldops/projects/:id/activities/new"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ActivityForm />
      </ProtectedRoute>} />
    <Route path="/fieldops/activities/:activityId"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ActivityDetail />
      </ProtectedRoute>} />
    <Route path="/fieldops/activities/:activityId/edit"
      element={<ProtectedRoute allowedRoles={['Admin','Supervisor']}
        requiredRight={PERMISSIONS.PROJECT_MANAGEMENT_PORTAL}>
        <ActivityForm />
      </ProtectedRoute>} />
    ```

**Checkpoint**: PM can create an activity, see it in the list, open its detail page, toggle tasks.
US3 (view + filter activities) is satisfied by T004 at this checkpoint.

---

## Phase 4: User Story 2 â€” Link Activities to Daily Work Log (Priority: P2)

**Goal**: PM selects activities worked on today in the daily log form. Tasks are checked off.
Overdue incomplete tasks require a delay reason before the log saves.

**Independent Test**: Open an active project with one InProgress activity (2 tasks, one overdue).
Submit Daily Log â†’ "Activities Worked Today" section shows the activity â†’ check it â†’ uncheck the
overdue task â†’ click Save â†’ blocked with "Delay reason required" error â†’ enter reason â†’ save succeeds
â†’ log saved with `activityEntries` in the response.

### Implementation for User Story 2

- [X] T009 [P] [US2] Add `activityEntries` subdocument to `backend-express/models/PMDailyLog.model.js`:
  - Before `pmDailyLogSchema`, add two subdoc schemas (exact schema from `data-model.md`):
    ```js
    const taskWorkEntrySchema = new mongoose.Schema({
      taskId:      { type: mongoose.Schema.Types.ObjectId, required: true },
      taskTitle:   { type: String, maxlength: 200 },
      completed:   { type: Boolean, default: false },
      delayReason: { type: String, maxlength: 500 }
    }, { _id: true, timestamps: false });

    const activityEntrySchema = new mongoose.Schema({
      activityId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
      activityTitle: { type: String, maxlength: 200 },
      tasksWorked:   [taskWorkEntrySchema],
      progressNote:  { type: String, maxlength: 500 }
    }, { _id: true, timestamps: false });
    ```
  - Add `activityEntries: [activityEntrySchema]` to `pmDailyLogSchema` body (before closing `}`)
  - Add index: `pmDailyLogSchema.index({ 'activityEntries.activityId': 1 });` after existing indexes

- [X] T010 [P] [US2] Update `createPMDailyLog` and `updatePMDailyLog` in `backend-express/controllers/fieldops.controller.js`:
  - In `createPMDailyLog`: find where `req.body` is destructured â†’ add `activityEntries` to the destructuring â†’ pass `activityEntries: activityEntries || []` in the `PMDailyLog.create({...})` call
  - In `updatePMDailyLog`: find where editable fields are applied to the log document â†’ add:
    ```js
    if (req.body.activityEntries !== undefined) {
      log.activityEntries = req.body.activityEntries;
    }
    ```
  - Do NOT change any other controller logic

- [X] T011 [US2] Add "Activities Worked Today" section to `frontend/src/pages/fieldops/pm-logs/PMDailyLogForm.jsx`
  (depends on T009 + T010 backend patches and T002 api.js):
  - Add two state variables at the top of the component (after existing state declarations):
    ```js
    const [openActivities, setOpenActivities] = useState([]);
    const [activityEntries, setActivityEntries] = useState([]);
    ```
  - In `loadData()`, after the project fetch succeeds:
    ```js
    try {
      const prefillRes = await fieldOpsApi.getDailyLogPrefill(projectId);
      setOpenActivities(prefillRes.data.data || []);
    } catch { /* non-blocking â€” daily log can proceed without activities */ }
    ```
  - If editing (`isEditing`), pre-populate `activityEntries` from `log.activityEntries || []`
  - Add helper functions (outside component or as useMemo):
    ```js
    // logDate is formData.logDate (YYYY-MM-DD string)
    const isTaskOverdue = (task, logDate) =>
      task.plannedEnd && new Date(task.plannedEnd) < new Date(logDate);
    ```
  - Add toggle functions:
    ```js
    const toggleActivity = (activity) => { /* add/remove from activityEntries */ };
    const toggleTask = (activityId, task, checked) => { /* update tasksWorked[].completed */ };
    const setDelayReason = (activityId, taskId, reason) => { /* update delayReason */ };
    ```
  - Add "Activities Worked Today" section in JSX â€” insert it after the Task Checklist section and before the Issues/Blockers section:
    - Glass card with collapsible header "Activities Worked Today" + count badge
    - If `openActivities.length === 0`: show info box "No open activities for this project. Create activities first." with link to `/fieldops/projects/${projectId}/activities`
    - For each open activity: a row with checkbox (checked = included in activityEntries) + activity title + type badge + task count
    - When checked: expand task list below the activity row â€” each task row: checkbox (completed), task title, deadline chip (red if `isTaskOverdue(task, formData.logDate)`)
    - Below each overdue+unchecked task: `<textarea placeholder="Delay reason (required)" value={delayReason} onChange={...} />` shown inline
    - `progressNote` textarea (optional, small, below task list): "Add note for this activity..."
  - Add validation before the existing `handleSubmit` API call:
    ```js
    const overdueWithoutReason = activityEntries.some(entry =>
      entry.tasksWorked.some(tw => {
        const act = openActivities.find(a => a._id === entry.activityId);
        const task = act?.tasks.find(t => t._id === tw.taskId);
        return isTaskOverdue(task, formData.logDate) && !tw.completed && !tw.delayReason?.trim();
      })
    );
    if (overdueWithoutReason) {
      toast.error('Provide delay reasons for all overdue incomplete tasks');
      return;
    }
    ```
  - Include `activityEntries` (strip derived `isOverdue` if present) in the API call body alongside existing formData fields

- [X] T012 [US2] Add read-only "Activities" section to `frontend/src/pages/fieldops/pm-logs/PMDailyLogView.jsx`
  (shown only when `log.activityEntries?.length > 0`):
  - Add after the existing "Work Summary" section (before the Progress + Checklist row):
    ```jsx
    {log.activityEntries?.length > 0 && (
      <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
        <SectionTitle icon={<Activity size={15} />} title="Activities Worked" badge={log.activityEntries.length} />
        {log.activityEntries.map(entry => (
          <div key={entry.activityId} style={{ marginBottom: '0.875rem', paddingBottom: '0.875rem', borderBottom: '1px solid var(--border-light,...)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
              {entry.activityTitle}
            </div>
            {entry.progressNote && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                {entry.progressNote}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {entry.tasksWorked.map(tw => (
                <div key={tw.taskId} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.8rem' }}>
                  {tw.completed
                    ? <CheckCircle size={13} style={{ color: 'var(--success-500,#10b981)', flexShrink: 0, marginTop: 1 }} />
                    : <XCircle size={13} style={{ color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0, marginTop: 1 }} />
                  }
                  <div style={{ flex: 1 }}>
                    <span style={{ color: tw.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: tw.completed ? 'line-through' : 'none' }}>
                      {tw.taskTitle}
                    </span>
                    {tw.delayReason && (
                      <div style={{ color: 'var(--warning-500,#f59e0b)', fontSize: '0.72rem', marginTop: 1 }}>
                        Delay: {tw.delayReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
    ```
  - Import `Activity` from lucide-react at the top (if not already imported)
  - `SectionTitle` is already defined locally in the file

**Checkpoint**: Daily log can be submitted with activity entries. Overdue tasks require delay reason.
Viewing a log shows which activities were worked on with task-level detail.

---

## Phase 5: User Story 3 â€” View All Activities for a Project (Priority: P3)

**Goal**: Filter activities by status/type; quick status-change from list.

**Independent Test**: Project with 3 activities (ToDo, InProgress, Done) â†’ Activities section â†’
filter status=InProgress â†’ only 1 shows â†’ change status dropdown on that card â†’ status updates.

US3 is **fully satisfied by T004** (ProjectActivitiesSection includes filter controls and
quick-status select). No additional implementation tasks are required.

**Checkpoint**: Covered at Phase 3 checkpoint (T004).

---

## Phase 6: User Story 4 â€” View Activity Detail (Priority: P4)

**Goal**: Click activity â†’ detail page with tasks, inline toggle, timeline, resources.

**Independent Test**: Activity with 2 tasks (1 done, 1 not) + plannedEnd dates â†’ detail page
shows both tasks with correct state â†’ check off the second task â†’ checkbox updates, doneBy shows.

US4 is **fully satisfied by T006** (ActivityDetail). No additional implementation tasks required.

**Checkpoint**: Covered at Phase 3 checkpoint (T006).

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T013 [P] Run `cd frontend && npm run lint` on all new/modified files â€” fix any errors in:
  `ProjectActivitiesSection.jsx`, `ActivityForm.jsx`, `ActivityDetail.jsx`,
  `PMDailyLogForm.jsx`, `PMDailyLogView.jsx`, `ProjectDetail.jsx`, `App.jsx`, `api.js`
- [X] T014 Manual browser validation per `specs/002-fieldops-project-activities/quickstart.md`:
  - Create activity â†’ appears in list âœ“
  - Edit activity â†’ changes persist âœ“
  - Daily log form loads activities âœ“
  - Overdue task without delay reason blocked âœ“
  - Log saved with activityEntries âœ“
  - Log view shows activities âœ“
  - Activity detail shows linked log entries âœ“

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies â€” start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 â€” T002 and T003 can run in parallel
- **US1 (Phase 3)**: Depends on T002 (api.js) â€” T004/T005/T006 can run in parallel; T007/T008 depend on T004/T005/T006
- **US2 (Phase 4)**: T009 and T010 can run in parallel (different files); T011 depends on T002+T009+T010; T012 is parallel with T011
- **US3 (Phase 5)**: Covered by T004 â€” no new tasks
- **US4 (Phase 6)**: Covered by T006 â€” no new tasks
- **Polish (Phase N)**: After all phases complete

### User Story Dependencies

- **US1 (P1)**: Requires T002 (api.js) complete first
- **US2 (P2)**: Requires T002 (getDailyLogPrefill) + T003 (plannedEnd) + T009+T010 (backend patches)
- **US3 (P3)**: Satisfied by T004 (US1) â€” no dependency beyond US1
- **US4 (P4)**: Satisfied by T006 (US1) â€” no dependency beyond US1

### Parallel Opportunities

```
T001             (setup â€” immediate)
T002 || T003     (foundational â€” parallel, different files)
T004 || T005 || T006  (US1 pages â€” parallel after T002)
T007 (after T004 URL confirmed)
T008 (after T004+T005+T006 exist)
T009 || T010     (US2 backend â€” parallel, different files)
T011 (after T009+T010 backend + T002 api.js)
T012 || T013     (parallel â€” different files)
T014             (validation â€” after all)
```

---

## Implementation Strategy

### MVP First (US1 only)

1. T001 â†’ directory
2. T002 + T003 (parallel) â†’ API methods + model patch
3. T004 + T005 + T006 (parallel) â†’ all three pages
4. T007 â†’ hub card
5. T008 â†’ routes
6. **Validate**: Create activity â†’ view list â†’ view detail â†’ toggle task
7. **Stop here** â€” US2/US3/US4 can follow

### Full Delivery

Continue with T009 â†’ T010 â†’ T011 â†’ T012 â†’ T013 â†’ T014

---

## Notes

- [P] tasks = different files, no shared dependencies
- `ActivityForm.jsx` handles both create (reads `projectId` param) and edit (reads `activityId` param) â€” detect mode via `useParams()` presence
- `leadEngineer` field in ActivityForm uses plain text input in MVP â€” full user search is a future enhancement
- The `activityEntries` in `PMDailyLogForm` strips any derived `isOverdue` boolean before sending to API (server does not expect it)
- When `openActivities` is empty in the daily log form, show info message â€” do not hide the section entirely
- `SectionTitle` component in `PMDailyLogView.jsx` already exists as a local helper â€” reuse it for the activities section

