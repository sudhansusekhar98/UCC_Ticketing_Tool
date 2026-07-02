// Generates a sequential per-day ID like "TKT-20260702-0007": PREFIX-YYYYMMDD-NNNN.
// Shared by every model that mints its own human-readable number in a pre-save hook.
export async function generateSequentialId(Model, fieldName, prefix) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const last = await Model.findOne({
    [fieldName]: new RegExp(`^${prefix}-${dateStr}-`)
  }).sort({ [fieldName]: -1 });

  let sequence = 1;
  if (last && last[fieldName]) {
    const parts = last[fieldName].split('-');
    if (parts.length >= 3) {
      const lastSequence = parseInt(parts[2]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}
