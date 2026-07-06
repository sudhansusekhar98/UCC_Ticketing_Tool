import mongoose from 'mongoose';

export const DEFAULT_SLA = {
  P1: { response: 15, restore: 60, esc1: 240, esc2: 60 },
  P2: { response: 30, restore: 240, esc1: 240, esc2: 60 },
  P3: { response: 60, restore: 480, esc1: 240, esc2: 60 },
  P4: { response: 120, restore: 1440, esc1: 240, esc2: 60 },
};

// Resolves the effective SLA policy for a priority: site override -> global SLAPolicy -> hardcoded defaults.
// Mirrors the resolution order in Ticket.model.js's pre-save hook.
export async function resolveSlaPolicy(priority, siteId) {
  let slaSource = null;

  if (siteId) {
    const Site = mongoose.model('Site');
    const site = await Site.findById(siteId).select('slaPolicies').lean();
    if (site?.slaPolicies?.length) {
      slaSource = site.slaPolicies.find(p => p.priority === priority);
    }
  }

  if (!slaSource) {
    const SLAPolicy = mongoose.model('SLAPolicy');
    slaSource = await SLAPolicy.findOne({ priority, isActive: true }).lean();
  }

  const defaults = DEFAULT_SLA[priority] || DEFAULT_SLA.P3;
  return {
    responseTimeMinutes: slaSource?.responseTimeMinutes ?? defaults.response,
    restoreTimeMinutes: slaSource?.restoreTimeMinutes ?? defaults.restore,
    escalationLevel1Minutes: slaSource?.escalationLevel1Minutes ?? defaults.esc1,
    escalationLevel2Minutes: slaSource?.escalationLevel2Minutes ?? defaults.esc2,
    escalationL1Emails: slaSource?.escalationL1Emails || '',
    escalationL2Emails: slaSource?.escalationL2Emails || '',
  };
}

// Reads the admin-configured EnableAutoEscalation flag from systemsettings (defaults to true).
export async function isAutoEscalationEnabled() {
  const settingsCollection = mongoose.connection.collection('systemsettings');
  const setting = await settingsCollection.findOne({ key: 'EnableAutoEscalation', category: 'SLA' });
  if (!setting) return true;
  return setting.value === 'true' || setting.value === true;
}
