/**
 * Suggested sub-tasks per activity type. Returned by
 * GET /api/fieldops/activities/task-suggestions?type=...
 * and used as the "SUGGESTED" chips on the Create Activity UI.
 */
export const ACTIVITY_TASK_TEMPLATES = {
  Technical: [
    'Site preparation and safety marking',
    'Mount device at designated location',
    'Run and terminate cable',
    'Configure IP / network settings',
    'Test feed / connectivity',
    'Integrate with NVR / controller',
    'Hand-over documentation'
  ],
  Construction: [
    'Site preparation and safety marking',
    'Trenching',
    'Road digging',
    'Cabling',
    'Conduit laying',
    'Backfilling',
    'Surface restoration'
  ],
  Maintenance: [
    'Inspect existing installation',
    'Clean and service device',
    'Replace faulty component',
    'Re-test and validate',
    'Log service report'
  ]
};

export const getTaskTemplates = (type) => ACTIVITY_TASK_TEMPLATES[type] || [];
