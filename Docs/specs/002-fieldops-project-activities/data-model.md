# Data Model: FieldOps Project Activities

## Backend model changes (minimal — existing model is almost complete)

### 1. `activityTaskSchema` — add `plannedEnd`

**File**: `backend-express/models/Activity.model.js`

```js
// Add to activityTaskSchema:
plannedEnd: {
  type: Date
}
```

**Why**: The user story requires per-task deadlines so the daily log form can detect overdue tasks.

---

### 2. New `activityEntrySchema` + extend `PMDailyLog`

**File**: `backend-express/models/PMDailyLog.model.js`

```js
const taskWorkEntrySchema = new mongoose.Schema({
  taskId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  taskTitle: { type: String, maxlength: 200 },     // snapshot at time of log
  completed: { type: Boolean, default: false },
  delayReason: { type: String, maxlength: 500 }    // filled when overdue + not completed
}, { _id: true, timestamps: false });

const activityEntrySchema = new mongoose.Schema({
  activityId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  activityTitle: { type: String, maxlength: 200 }, // snapshot
  tasksWorked:  [taskWorkEntrySchema],
  progressNote: { type: String, maxlength: 500 }
}, { _id: true, timestamps: false });

// Add to pmDailyLogSchema:
activityEntries: [activityEntrySchema]
```

**Index to add**:
```js
pmDailyLogSchema.index({ 'activityEntries.activityId': 1 });
```

---

### 3. `fieldops.controller.js` — handle `activityEntries` in create/update

**File**: `backend-express/controllers/fieldops.controller.js`

In `createPMDailyLog` and `updatePMDailyLog`:
- Accept `activityEntries` from `req.body`
- Pass array to model as-is (no server-side overdue validation per research decision)

---

## Frontend state shapes

### Activity (from API)
```ts
{
  _id: string
  activityNumber: string           // 'ACT-20260513-0001'
  projectId: string
  title: string
  description?: string
  type: 'Technical' | 'Construction' | 'Maintenance'
  status: 'ToDo' | 'InProgress' | 'Review' | 'Done' | 'Blocked'
  priority: 'Low' | 'Med' | 'High'
  leadEngineer: { _id: string; fullName: string; email: string }
  assignees: { _id: string; fullName: string }[]
  requiredDevices: { deviceTypeId?: string; deviceTypeName: string; qty: number }[]
  requiredStockItems: { itemId: string; itemName: string; qty: number }[]
  tasks: {
    _id: string
    title: string
    order: number
    done: boolean
    doneBy?: string
    doneAt?: string
    notes?: string
    plannedEnd?: string            // ISO date string (NEW)
  }[]
  progressPercentage: number
  plannedStart?: string
  plannedEnd?: string
  actualStart?: string
  actualEnd?: string
  createdBy: string
  createdAt: string
}
```

### ActivityEntry (inside PMDailyLog form state)
```ts
{
  activityId: string
  activityTitle: string
  tasksWorked: {
    taskId: string
    taskTitle: string
    completed: boolean
    delayReason: string            // '' when not needed
    isOverdue: boolean             // derived: plannedEnd < logDate && !completed
  }[]
  progressNote: string
}
```

### Form validation rule
```
For each activityEntry:
  For each taskWorked where isOverdue && !completed:
    delayReason MUST be non-empty
```
