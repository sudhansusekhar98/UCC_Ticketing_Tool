// Read-only, RBAC-scoped data lookups the AI assistant is allowed to call.
// Every function enforces the same site-scoping rule already used across the
// controllers (Admin/Supervisor see everything, everyone else is restricted
// to user.assignedSites) — the model can only ever request a tool call, it
// can never see data the calling function didn't return.
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.model.js';
import Site from '../models/Site.model.js';
import Asset from '../models/Asset.model.js';
import RMARequest from '../models/RMARequest.model.js';
import User from '../models/User.model.js';
import DailyWorkLog from '../models/DailyWorkLog.model.js';

const GLOBAL_ROLES = ['Admin', 'Supervisor'];

function toObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function hasGlobalScope(user) {
  return GLOBAL_ROLES.includes(user.role);
}

function allowedSiteIds(user) {
  return (user.assignedSites || []).map((s) => String(s));
}

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Plain Levenshtein edit distance — used to tolerate typos in a site name
// (e.g. "Hed Ofice" for "Head Office") when the regex lookup finds nothing.
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Picks the closest candidate to `query` by edit distance on `field`, tolerating
// roughly up to ~40% of the query's length differing (typos, not a different word).
function closestByName(candidates, field, query) {
  const q = query.toLowerCase();
  let best = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = levenshtein(q, (candidate[field] || '').toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  const threshold = Math.max(2, Math.ceil(q.length * 0.4));
  return bestDistance <= threshold ? best : null;
}

// Best fuzzy match for a misspelled site name among the sites the user can see.
// Only used as a fallback when an exact/substring lookup finds nothing.
async function fuzzyFindSite(user, requestedSite) {
  const scopeFilter = hasGlobalScope(user)
    ? {}
    : { _id: { $in: allowedSiteIds(user).map(toObjectId).filter(Boolean) } };
  const candidates = await Site.find(scopeFilter).select('_id siteName').lean();
  return closestByName(candidates, 'siteName', requestedSite);
}

// Resolves "another user" (Admin/Supervisor asking about someone else's tickets) by
// id, name, username or email — with the same typo-tolerant fallback as sites.
async function resolveTargetUser(query) {
  const asId = toObjectId(query);
  if (asId) return User.findById(asId).select('_id fullName role').lean();

  const exact = await User.findOne({
    $or: [
      { fullName: { $regex: escapeRegex(query), $options: 'i' } },
      { email: { $regex: escapeRegex(query), $options: 'i' } },
      { username: { $regex: escapeRegex(query), $options: 'i' } }
    ]
  }).select('_id fullName role').lean();
  if (exact) return exact;

  // ponytail: fetches all active users for the fuzzy pass — fine at this org's scale,
  // revisit with a $text index if the user base grows into the thousands.
  const candidates = await User.find({ isActive: true }).select('_id fullName role').lean();
  return closestByName(candidates, 'fullName', query);
}

// Same work-log visibility rule as worklog.controller.js#canViewUserLogs: Admin logs
// are private to that Admin only; Supervisor logs are visible to that Supervisor and
// to Admins only; everyone else's logs are visible to Admin/Supervisor.
function canViewWorkLogsOf(requester, targetRole) {
  if (targetRole === 'Admin') return false;
  if (targetRole === 'Supervisor') return requester.role === 'Admin';
  return true;
}

// Resolves an asset by ObjectId, code, serial number or MAC — same lookup fields
// getAssetInfo already searches by, so "RMAs for asset X" can reuse the same wording.
async function resolveAssetByCodeOrId(query) {
  const asId = toObjectId(query);
  if (asId) return Asset.findById(asId).select('_id').lean();
  return Asset.findOne({
    $or: [
      { assetCode: { $regex: escapeRegex(query), $options: 'i' } },
      { serialNumber: { $regex: escapeRegex(query), $options: 'i' } },
      { mac: { $regex: escapeRegex(query), $options: 'i' } }
    ]
  }).select('_id').lean();
}

// Resolves a requested site — a Mongo ObjectId OR a free-text name/abbreviation,
// possibly misspelled (the model is told the site name, e.g. "Head Office", it
// has no way to know IDs) — against the user's access. Returns:
//  - { ok: true, siteId } when access is fine (siteId may be null = "all my sites")
//  - { ok: false, notFound: true } when no site matched the given name
//  - { ok: false } when the user asked about a site they cannot see
async function resolveSiteScope(user, requestedSite) {
  if (!requestedSite) {
    return { ok: true, siteId: null };
  }

  const asId = toObjectId(requestedSite);
  let site = asId
    ? await Site.findById(asId).select('_id').lean()
    : await Site.findOne({
      $or: [
        { siteName: { $regex: escapeRegex(requestedSite), $options: 'i' } },
        { abbreviation: { $regex: escapeRegex(requestedSite), $options: 'i' } }
      ]
    }).select('_id').lean();

  if (!site && !asId) {
    site = await fuzzyFindSite(user, requestedSite);
  }

  if (!site) return { ok: false, notFound: true };
  if (!hasGlobalScope(user) && !allowedSiteIds(user).includes(String(site._id))) {
    return { ok: false };
  }
  return { ok: true, siteId: String(site._id) };
}

// Builds the site-restricting part of a Mongo query for the given user.
// null siteId param = "every site the user can see" (all sites for Admin/Supervisor).
function siteMatch(user, siteId) {
  if (siteId) return { siteId: toObjectId(siteId) };
  if (hasGlobalScope(user)) return {};
  return { siteId: { $in: allowedSiteIds(user).map(toObjectId).filter(Boolean) } };
}

// Same ticket-visibility rule as GET /api/tickets (ticket.controller.js#getTickets):
// SiteClient sees only what they created; everyone but Admin also sees tickets
// assigned to or created by them, on top of their assigned sites. Used whenever no
// specific site was requested, so "my ticket" questions aren't limited to site scope.
function ticketOwnershipScope(user) {
  if (user.role === 'SiteClient') return { createdBy: user._id };
  if (user.role === 'Admin') return {};
  return {
    $or: [
      { assignedTo: user._id },
      { createdBy: user._id },
      { siteId: { $in: allowedSiteIds(user).map(toObjectId).filter(Boolean) } }
    ]
  };
}

// Adds a date bound on `field` to a query in place — either an explicit from/to
// range ("yesterday", "on 3 Aug", "last month" — the model resolves these to
// YYYY-MM-DD itself using today's date from the guardrail instruction) or a
// relative "last N days" window. No-op when none of days/from/to are given.
// from/to are parsed as LOCAL midnight/end-of-day, matching how dates are stored
// (worklog.controller.js#parseLocalDate — same reasoning: new Date('YYYY-MM-DD')
// is UTC midnight, which shifts the day in non-UTC timezones).
function applyDateFilter(query, field, { days, from, to } = {}) {
  if (from || to) {
    query[field] = {};
    if (from) query[field].$gte = new Date(`${from}T00:00:00`);
    if (to) query[field].$lte = new Date(`${to}T23:59:59.999`);
  } else if (days) {
    query[field] = { $gte: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000) };
  }
}

// Top 10 sites by count for `query` against `Model` — used whenever no specific
// site was requested, so "which site has the most X" is answerable directly.
// countExpr lets a caller sum a field (e.g. stock quantity) instead of counting docs.
async function siteBreakdown(Model, query, countExpr = { $sum: 1 }) {
  return Model.aggregate([
    { $match: query },
    { $group: { _id: '$siteId', count: countExpr } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'sites', localField: '_id', foreignField: '_id', as: 'site' } },
    { $unwind: { path: '$site', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, siteName: { $ifNull: ['$site.siteName', 'Unknown'] }, count: 1 } }
  ]);
}

function scopeErrorResult(scope, requestedSite) {
  if (scope.notFound) return { error: 'not_found', message: `No site found matching "${requestedSite}".` };
  return { error: 'not_authorized', message: 'You do not have access to that site.' };
}

// Merges another $or clause into a query that may already have one (AND of both).
function addOrClause(query, orClause) {
  if (query.$or) {
    query.$and = [...(query.$and || []), { $or: query.$or }, { $or: orClause }];
    delete query.$or;
  } else if (query.$and) {
    query.$and.push({ $or: orClause });
  } else {
    query.$or = orClause;
  }
}

async function getTicketSummary(user, { site, status, priority, search, forUser, days, from, to, sortBy } = {}) {
  const scope = await resolveSiteScope(user, site);
  if (!scope.ok) return scopeErrorResult(scope, site);

  let query;
  if (forUser) {
    // Asking about someone else's tickets is an Admin/Supervisor privilege — everyone
    // else (engineers, SiteClient, ...) is limited to their own tickets/sites.
    if (!hasGlobalScope(user)) {
      return { error: 'not_authorized', message: 'You can only ask about your own tickets — asking about another user requires Admin or Supervisor access.' };
    }
    const target = await resolveTargetUser(forUser);
    if (!target) return { error: 'not_found', message: `No user found matching "${forUser}".` };
    query = { $or: [{ createdBy: target._id }, { assignedTo: target._id }] };
    if (scope.siteId) query.siteId = toObjectId(scope.siteId);
  } else {
    // An explicit site was requested (and already RBAC-checked above) — otherwise fall
    // back to the same ownership rule the ticket list page uses, so a user's own tickets
    // (created by / assigned to them) are visible even outside their assigned sites.
    query = scope.siteId ? { siteId: toObjectId(scope.siteId) } : ticketOwnershipScope(user);
  }

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (search) {
    addOrClause(query, [
      { ticketNumber: { $regex: escapeRegex(search), $options: 'i' } },
      { title: { $regex: escapeRegex(search), $options: 'i' } }
    ]);
  }
  applyDateFilter(query, 'createdAt', { days, from, to });

  // "Which ticket took longest to close" needs the actual slowest ticket, not
  // whatever happens to be in the 5 most recent — sort by closedOn - createdAt instead.
  const wantsLongest = sortBy === 'longestToClose';
  const sampleQuery = wantsLongest
    ? Ticket.aggregate([
      { $match: { ...query, closedOn: { $ne: null } } },
      { $addFields: { durationHours: { $divide: [{ $subtract: ['$closedOn', '$createdAt'] }, 3600000] } } },
      { $sort: { durationHours: -1 } },
      { $limit: 5 },
      { $project: { ticketNumber: 1, title: 1, status: 1, priority: 1, createdAt: 1, closedOn: 1, durationHours: 1 } }
    ])
    : Ticket.find(query).sort({ createdAt: -1 }).limit(5)
      .select('ticketNumber title status priority siteId createdAt closedOn').lean();

  const [byStatus, slaBreached, sample, bySite] = await Promise.all([
    Ticket.aggregate([{ $match: query }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.countDocuments({ ...query, isSLABreached: true }),
    sampleQuery,
    scope.siteId ? null : siteBreakdown(Ticket, query)
  ]);

  return {
    totalMatching: byStatus.reduce((sum, g) => sum + g.count, 0),
    countsByStatus: Object.fromEntries(byStatus.map((g) => [g._id, g.count])),
    slaBreachedCount: slaBreached,
    ...(bySite ? { countsBySite: bySite } : {}),
    recentTickets: sample.map((t) => ({
      ...(t.createdAt && t.closedOn ? { hoursToClose: Math.round((t.closedOn - t.createdAt) / 3600000 * 10) / 10 } : {}),
      ticketNumber: t.ticketNumber, title: t.title, status: t.status, priority: t.priority
    }))
  };
}

async function getSiteInfo(user, { site } = {}) {
  const scope = await resolveSiteScope(user, site);
  if (!scope.ok) return scopeErrorResult(scope, site);

  const query = scope.siteId ? { _id: toObjectId(scope.siteId) } : { _id: { $in: allowedSiteIds(user).map(toObjectId).filter(Boolean) } };
  if (!scope.siteId && hasGlobalScope(user)) {
    // Global roles with no specific site asked: keep it light, just count sites.
    const total = await Site.countDocuments({});
    return { totalSites: total, message: 'Ask about a specific site for details.' };
  }

  const sites = await Site.find(query).select('siteName siteUniqueID city zone isActive slaTargets').limit(10).lean();
  return { sites };
}

async function getAssetInfo(user, { site, search, days, from, to } = {}) {
  const scope = await resolveSiteScope(user, site);
  if (!scope.ok) return scopeErrorResult(scope, site);

  const query = { ...siteMatch(user, scope.siteId) };
  if (search) {
    query.$or = [
      { assetCode: { $regex: search, $options: 'i' } },
      { serialNumber: { $regex: search, $options: 'i' } },
      { mac: { $regex: search, $options: 'i' } }
    ];
  }
  applyDateFilter(query, 'createdAt', { days, from, to });

  const [byStatus, sample] = await Promise.all([
    Asset.aggregate([{ $match: query }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Asset.find(query).sort({ updatedAt: -1 }).limit(5)
      .select('assetCode assetType status siteId serialNumber').lean()
  ]);

  return {
    totalMatching: byStatus.reduce((sum, g) => sum + g.count, 0),
    countsByStatus: Object.fromEntries(byStatus.map((g) => [g._id, g.count])),
    recentAssets: sample.map((a) => ({
      assetCode: a.assetCode, assetType: a.assetType, status: a.status, serialNumber: a.serialNumber
    }))
  };
}

async function getStockLevels(user, { site } = {}) {
  const scope = await resolveSiteScope(user, site);
  if (!scope.ok) return scopeErrorResult(scope, site);

  const query = { ...siteMatch(user, scope.siteId), status: 'Spare' };
  const qtySum = { $sum: { $ifNull: ['$quantity', 1] } };
  const [byType, bySite] = await Promise.all([
    Asset.aggregate([{ $match: query }, { $group: { _id: '$assetType', count: qtySum } }]),
    // No specific site given: totals above would otherwise merge every site into one
    // number — break it down per site too, so "which site is low on stock" is answerable.
    scope.siteId ? null : siteBreakdown(Asset, query, qtySum)
  ]);

  return {
    spareStockByType: Object.fromEntries(byType.map((g) => [g._id, g.count])),
    ...(bySite ? { spareStockBySite: bySite } : {})
  };
}

async function getRmaStatus(user, { site, status, days, from, to, asset, forUser } = {}) {
  const scope = await resolveSiteScope(user, site);
  if (!scope.ok) return scopeErrorResult(scope, site);

  const query = { ...siteMatch(user, scope.siteId) };
  if (status) query.status = status;
  applyDateFilter(query, 'createdAt', { days, from, to });

  if (asset) {
    const found = await resolveAssetByCodeOrId(asset);
    if (!found) return { error: 'not_found', message: `No asset found matching "${asset}".` };
    query.originalAssetId = found._id;
  }

  if (forUser) {
    const target = await resolveTargetUser(forUser);
    if (!target) return { error: 'not_found', message: `No user found matching "${forUser}".` };
    // Asking about someone else's RMAs is an Admin/Supervisor privilege, same as tickets —
    // but asking about your own is always fine, however the account is referred to.
    if (String(target._id) !== String(user._id) && !hasGlobalScope(user)) {
      return { error: 'not_authorized', message: 'You can only ask about your own RMAs — asking about another user requires Admin or Supervisor access.' };
    }
    query.requestedBy = target._id;
  }

  const rmas = await RMARequest.find(query).sort({ createdAt: -1 }).limit(5)
    .select('rmaNumber status siteId createdAt').lean();
  const byStatus = await RMARequest.aggregate([{ $match: query }, { $group: { _id: '$status', count: { $sum: 1 } } }]);

  // No specific site requested = the results span multiple sites — break down by site too,
  // so "which site has the most RMAs" is answerable without a second round-trip.
  const bySite = scope.siteId ? null : await siteBreakdown(RMARequest, query);

  return {
    totalMatching: byStatus.reduce((sum, g) => sum + g.count, 0),
    countsByStatus: Object.fromEntries(byStatus.map((g) => [g._id, g.count])),
    ...(bySite ? { countsBySite: bySite } : {}),
    recentRmas: rmas.map((r) => ({ rmaNumber: r.rmaNumber, status: r.status }))
  };
}

// "What did [user] work on yesterday/last month/on 3 Aug" — per-day activity log
// (auto-logged system actions + manual entries) with per-category stats totals.
// Same RBAC as GET /api/worklogs/user/:userId: own logs always visible; someone
// else's requires Admin/Supervisor AND canViewWorkLogsOf.
async function getWorkLogSummary(user, { forUser, days, from, to } = {}) {
  let target = { _id: user._id, fullName: user.fullName };
  if (forUser) {
    const resolved = await resolveTargetUser(forUser);
    if (!resolved) return { error: 'not_found', message: `No user found matching "${forUser}".` };
    if (String(resolved._id) !== String(user._id)) {
      if (!hasGlobalScope(user) || !canViewWorkLogsOf(user, resolved.role)) {
        return { error: 'not_authorized', message: 'You are not authorized to view that user\'s work logs.' };
      }
    }
    target = resolved;
  }

  const query = { userId: target._id };
  applyDateFilter(query, 'date', { days, from, to });
  // No explicit range at all defaults to today, same as the team-logs view.
  if (!days && !from && !to) query.date = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };

  const logs = await DailyWorkLog.find(query).sort({ date: -1 }).limit(31)
    .select('date dailySummary stats activities').lean();

  const totals = logs.reduce((acc, log) => {
    for (const [key, value] of Object.entries(log.stats || {})) acc[key] = (acc[key] || 0) + value;
    return acc;
  }, {});

  return {
    userName: target.fullName,
    daysLogged: logs.length,
    totals,
    logs: logs.map((l) => ({
      date: l.date,
      summary: l.dailySummary || null,
      // Capped per day — a busy day can auto-log dozens of entries; enough here to
      // answer "what did they work on", not to reproduce the full audit trail.
      activities: (l.activities || []).slice(0, 8).map((a) => ({ category: a.category, description: a.description }))
    }))
  };
}

// Gemini function-calling declarations for the tools above.
export const TOOL_DECLARATIONS = [
  {
    name: 'getTicketSummary',
    description: 'Get ticket counts, SLA breach counts and recent tickets (with their ticket numbers), optionally ' +
      'filtered by site/status/priority/a keyword or ticket number search/time window. With no filters, returns the ' +
      "current user's own tickets (created by or assigned to them) plus their sites. When no site is given, also " +
      'returns countsBySite (top sites by ticket count, highest first) — use that for "which site has the most tickets" style questions.',
    parameters: {
      type: 'object',
      properties: {
        site: { type: 'string', description: 'Site name (e.g. "Head Office") or Mongo ObjectId, if the question is about one specific site' },
        status: { type: 'string', description: 'Ticket status filter, e.g. Open, InProgress, Resolved' },
        priority: { type: 'string', description: 'Ticket priority filter, e.g. P1, P2, P3, P4' },
        search: { type: 'string', description: 'Keyword or ticket number to search titles/ticket numbers for' },
        forUser: { type: 'string', description: "Another user's name, username or email, if asking about someone else's tickets. Admin/Supervisor only — do not pass this for other roles." },
        days: { type: 'number', description: 'Only count tickets created in the last N days, e.g. 7 for "past week"' },
        from: { type: 'string', description: 'Only count tickets created on/after this date (YYYY-MM-DD) — resolve "yesterday"/"3 Aug"/"last month" etc. yourself using today\'s date. Use instead of days for a specific day or explicit range.' },
        to: { type: 'string', description: 'Only count tickets created on/before this date (YYYY-MM-DD). For a single specific day, pass the same value as both from and to.' },
        sortBy: {
          type: 'string', enum: ['newest', 'longestToClose'],
          description: 'Use "longestToClose" for questions like "which ticket took the longest to close/resolve" — ' +
            'returns the slowest closed tickets with hoursToClose. Default "newest" returns the most recent.'
        }
      }
    }
  },
  {
    name: 'getSiteInfo',
    description: 'Get details about a specific site (name, city, zone, SLA targets) or a count of sites the user can see.',
    parameters: {
      type: 'object',
      properties: { site: { type: 'string', description: 'Site name (e.g. "Head Office") or Mongo ObjectId' } }
    }
  },
  {
    name: 'getAssetInfo',
    description: 'Get asset counts by status and recent assets, optionally filtered by site/a search term (code/serial/MAC)/time window.',
    parameters: {
      type: 'object',
      properties: {
        site: { type: 'string', description: 'Site name (e.g. "Head Office") or Mongo ObjectId' },
        search: { type: 'string', description: 'Search term for asset code, serial number or MAC address' },
        days: { type: 'number', description: 'Only count assets created in the last N days, e.g. 7 for "past week"' },
        from: { type: 'string', description: 'Only count assets created on/after this date (YYYY-MM-DD) — resolve "yesterday"/"3 Aug"/"last month" etc. yourself using today\'s date.' },
        to: { type: 'string', description: 'Only count assets created on/before this date (YYYY-MM-DD). For a single specific day, pass the same value as both from and to.' }
      }
    }
  },
  {
    name: 'getStockLevels',
    description: 'Get spare stock counts by asset type for a site. When no site is given, also returns ' +
      'spareStockBySite (total spare stock per site, highest first) — use that for "which site is low on stock" ' +
      'style questions instead of the merged spareStockByType total.',
    parameters: {
      type: 'object',
      properties: { site: { type: 'string', description: 'Site name (e.g. "Head Office") or Mongo ObjectId' } }
    }
  },
  {
    name: 'getRmaStatus',
    description: 'Get RMA request counts by status and recent RMAs, optionally filtered by site/status/time window. ' +
      'When no site is given, also returns countsBySite (top sites by RMA count, highest first) — use that for ' +
      '"which site has the most RMAs" style questions instead of asking site by site.',
    parameters: {
      type: 'object',
      properties: {
        site: { type: 'string', description: 'Site name (e.g. "Head Office") or Mongo ObjectId' },
        status: { type: 'string', description: 'RMA status filter' },
        days: { type: 'number', description: 'Only count RMAs created in the last N days, e.g. 7 for "past week"' },
        from: { type: 'string', description: 'Only count RMAs created on/after this date (YYYY-MM-DD) — resolve "yesterday"/"3 Aug"/"last month" etc. yourself using today\'s date.' },
        to: { type: 'string', description: 'Only count RMAs created on/before this date (YYYY-MM-DD). For a single specific day, pass the same value as both from and to.' },
        asset: { type: 'string', description: 'Asset code, serial number, MAC address or Mongo ObjectId — for "RMAs for asset X" questions' },
        forUser: { type: 'string', description: "A user's name, username or email, for \"how many RMAs did [user] raise\" questions. Asking about your own is always fine; asking about someone else requires Admin or Supervisor access." }
      }
    }
  },
  {
    name: 'getWorkLogSummary',
    description: 'Get a user\'s daily work log: what they worked on (auto-logged system actions like tickets/assets/' +
      'RMAs touched, plus manual entries like site visits) and per-category activity totals, for a day, a date range, ' +
      'or the last N days. Use for "what did [user] work on yesterday/last week/on 3 Aug/in the last month" questions. ' +
      'With no date given, defaults to today. With no forUser, defaults to the current user\'s own log.',
    parameters: {
      type: 'object',
      properties: {
        forUser: { type: 'string', description: "A user's name, username or email. Asking about your own log is always fine; asking about someone else's requires Admin or Supervisor access, and is further restricted by role (an Admin's log is private to them; a Supervisor's log is visible only to Admins)." },
        days: { type: 'number', description: 'Work logs from the last N days, e.g. 30 for "last month"' },
        from: { type: 'string', description: 'Work logs on/after this date (YYYY-MM-DD) — resolve "yesterday"/"3 Aug"/"last month" etc. yourself using today\'s date.' },
        to: { type: 'string', description: 'Work logs on/before this date (YYYY-MM-DD). For a single specific day, pass the same value as both from and to.' }
      }
    }
  }
];

const TOOL_IMPLEMENTATIONS = {
  getTicketSummary, getSiteInfo, getAssetInfo, getStockLevels, getRmaStatus, getWorkLogSummary
};

// Executes a tool call by name for the given user. Unknown tool = not_authorized,
// never throws (a bad/unknown call must degrade safely, not crash the chat).
export async function runTool(user, name, args = {}) {
  const impl = TOOL_IMPLEMENTATIONS[name];
  if (!impl) return { error: 'unknown_tool' };
  try {
    return await impl(user, args || {});
  } catch (err) {
    return { error: 'tool_failed', message: err.message };
  }
}
