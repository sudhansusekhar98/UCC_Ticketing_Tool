/**
 * AI assistant tools – RBAC enforcement tests.
 * A user without access to a site must get { error: 'not_authorized' } and
 * the underlying query must never run for a site outside their scope.
 */
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { objectId, mockAdminUser } from '../helpers.js';

const mockTicketModel = {
  aggregate: jest.fn().mockResolvedValue([]),
  countDocuments: jest.fn().mockResolvedValue(0),
  find: jest.fn(() => ({
    sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }) })
  })),
};

// Site.findById(<id>) resolves the site itself (id lookups); Site.findOne(...) resolves
// name/abbreviation lookups; Site.find(...) is the fuzzy-match candidate list (getSiteInfo
// chains .limit() on it, fuzzyFindSite doesn't — support both).
const mockSiteModel = {
  countDocuments: jest.fn().mockResolvedValue(0),
  find: jest.fn(() => ({
    select: () => ({
      limit: () => ({ lean: () => Promise.resolve([]) }),
      lean: () => Promise.resolve([])
    })
  })),
  findById: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve(null) }) })),
  findOne: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve(null) }) })),
};

const mockUserModel = {
  findById: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve(null) }) })),
  findOne: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve(null) }) })),
  find: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve([]) }) })),
};

jest.unstable_mockModule('../../models/Ticket.model.js', () => ({ default: mockTicketModel }));
jest.unstable_mockModule('../../models/Site.model.js', () => ({ default: mockSiteModel }));
const mockAssetModel = {
  aggregate: jest.fn().mockResolvedValue([]),
  findById: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve(null) }) })),
  findOne: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve(null) }) })),
};
jest.unstable_mockModule('../../models/Asset.model.js', () => ({ default: mockAssetModel }));
const mockRmaModel = {
  aggregate: jest.fn().mockResolvedValue([]),
  find: jest.fn(() => ({
    sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }) })
  })),
};

jest.unstable_mockModule('../../models/RMARequest.model.js', () => ({ default: mockRmaModel }));
jest.unstable_mockModule('../../models/User.model.js', () => ({ default: mockUserModel }));
const mockWorkLogModel = {
  find: jest.fn(() => ({
    sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }) })
  })),
};
jest.unstable_mockModule('../../models/DailyWorkLog.model.js', () => ({ default: mockWorkLogModel }));

let runTool;
beforeAll(async () => {
  ({ runTool } = await import('../../services/aiTools.js'));
});

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks doesn't undo a test's mockReturnValue override — reinstall the
  // "no site found" default explicitly so each test starts from a clean slate.
  mockSiteModel.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
  mockSiteModel.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
  mockSiteModel.find.mockReturnValue({
    select: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }), lean: () => Promise.resolve([]) })
  });
  mockUserModel.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
  mockUserModel.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
  mockUserModel.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
  mockAssetModel.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
  mockAssetModel.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
});

const mockL1User = (overrides = {}) => ({
  _id: objectId(),
  role: 'L1Engineer',
  assignedSites: [],
  ...overrides,
});

// Helper: make Site.findById(id) resolve to { _id: id } (site exists, id lookup).
function mockSiteExistsById(id) {
  mockSiteModel.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ _id: id }) }) });
}
// Helper: make Site.findOne(...) resolve to { _id } (name/abbreviation lookup match).
function mockSiteFoundByName(id) {
  mockSiteModel.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ _id: id }) }) });
}
// Helper: make Site.find(...) (the fuzzy-match candidate pool) resolve to the given sites.
function mockSiteCandidates(sites) {
  mockSiteModel.find.mockReturnValue({
    select: () => ({
      limit: () => ({ lean: () => Promise.resolve(sites) }),
      lean: () => Promise.resolve(sites)
    })
  });
}

// Helper: make User.findOne(...) resolve to the given user (name/email/username lookup).
function mockUserFoundByName(userDoc) {
  mockUserModel.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(userDoc) }) });
}

describe('aiTools RBAC', () => {
  it("includes the user's own tickets (created by / assigned to them) beyond their assigned sites", async () => {
    const user = mockL1User({ assignedSites: [objectId()] });

    await runTool(user, 'getTicketSummary', {});

    const matchStage = mockTicketModel.aggregate.mock.calls[0][0][0].$match;
    expect(matchStage.$or).toEqual(expect.arrayContaining([
      { assignedTo: user._id },
      { createdBy: user._id }
    ]));
  });

  it('returns ticketNumber (not ticketId) on recent tickets', async () => {
    mockTicketModel.find.mockReturnValue({
      sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve([
        { ticketNumber: 'TKT-20260101-0001', title: 'Camera down', status: 'Open', priority: 'P2' }
      ]) }) }) })
    });
    const user = mockAdminUser();

    const result = await runTool(user, 'getTicketSummary', {});

    expect(result.recentTickets[0].ticketNumber).toBe('TKT-20260101-0001');
    expect(result.recentTickets[0].ticketId).toBeUndefined();
  });

  it('denies an engineer asking about another user\'s tickets', async () => {
    const user = mockL1User();

    const result = await runTool(user, 'getTicketSummary', { forUser: 'Jane Doe' });

    expect(result).toEqual({ error: 'not_authorized', message: expect.any(String) });
    expect(mockUserModel.findOne).not.toHaveBeenCalled();
  });

  it('lets a Supervisor ask about another user\'s tickets', async () => {
    const target = { _id: objectId(), fullName: 'Jane Doe' };
    mockUserFoundByName(target);
    const supervisor = mockL1User({ role: 'Supervisor' });

    const result = await runTool(supervisor, 'getTicketSummary', { forUser: 'Jane Doe' });

    expect(mockUserModel.findOne).toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    const matchStage = mockTicketModel.aggregate.mock.calls[0][0][0].$match;
    expect(matchStage.$or).toEqual(expect.arrayContaining([
      { createdBy: target._id }, { assignedTo: target._id }
    ]));
  });

  it('returns not_found when Admin asks about a user that does not exist', async () => {
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getTicketSummary', { forUser: 'Nobody Here' });

    expect(result.error).toBe('not_found');
  });

  it('denies a non-admin asking (by id) about a site outside their assignedSites', async () => {
    const mySite = objectId();
    const otherSite = objectId();
    mockSiteExistsById(otherSite);
    const user = mockL1User({ assignedSites: [mySite] });

    const result = await runTool(user, 'getTicketSummary', { site: String(otherSite) });

    expect(result).toEqual({ error: 'not_authorized', message: expect.any(String) });
    expect(mockTicketModel.aggregate).not.toHaveBeenCalled();
  });

  it('allows a non-admin asking (by id) about their own assigned site', async () => {
    const mySite = objectId();
    mockSiteExistsById(mySite);
    const user = mockL1User({ assignedSites: [mySite] });

    const result = await runTool(user, 'getTicketSummary', { site: String(mySite) });

    expect(result.error).toBeUndefined();
    expect(mockTicketModel.aggregate).toHaveBeenCalled();
  });

  it('resolves a site given by name (e.g. "Head Office") to its id, scoped to access', async () => {
    const mySite = objectId();
    mockSiteFoundByName(mySite);
    const user = mockL1User({ assignedSites: [mySite] });

    const result = await runTool(user, 'getTicketSummary', { site: 'Head Office' });

    expect(mockSiteModel.findOne).toHaveBeenCalled();
    expect(result.error).toBeUndefined();
  });

  it('denies a non-admin whose site name resolves to a site outside their access', async () => {
    const otherSite = objectId();
    mockSiteFoundByName(otherSite);
    const user = mockL1User({ assignedSites: [objectId()] });

    const result = await runTool(user, 'getTicketSummary', { site: 'Head Office' });

    expect(result).toEqual({ error: 'not_authorized', message: expect.any(String) });
  });

  it('returns not_found when no site matches the given name, even fuzzily', async () => {
    mockSiteCandidates([{ _id: objectId(), siteName: 'Downtown Depot' }]);
    const user = mockL1User({ assignedSites: [objectId()] });

    const result = await runTool(user, 'getTicketSummary', { site: 'Nonexistent Site' });

    expect(result.error).toBe('not_found');
  });

  it('falls back to a fuzzy match for a misspelled site name', async () => {
    const headOffice = objectId();
    mockSiteCandidates([
      { _id: headOffice, siteName: 'Head Office' },
      { _id: objectId(), siteName: 'North Depot' }
    ]);
    const user = mockL1User({ assignedSites: [headOffice] });

    const result = await runTool(user, 'getTicketSummary', { site: 'Hed Ofice' });

    expect(result.error).toBeUndefined();
  });

  it('allows Admin to query any site by id', async () => {
    const someSite = objectId();
    mockSiteExistsById(someSite);
    const admin = mockAdminUser({ assignedSites: [] });

    const result = await runTool(admin, 'getSiteInfo', { site: String(someSite) });

    expect(result.error).toBeUndefined();
  });

  it('breaks down RMAs by site when no specific site was requested', async () => {
    mockRmaModel.aggregate
      .mockResolvedValueOnce([{ _id: 'RequestedForApproval', count: 3 }]) // byStatus
      .mockResolvedValueOnce([{ siteName: 'Head Office', count: 5 }, { siteName: 'Downtown Depot', count: 2 }]); // bySite
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getRmaStatus', {});

    expect(result.countsBySite).toEqual([
      { siteName: 'Head Office', count: 5 }, { siteName: 'Downtown Depot', count: 2 }
    ]);
  });

  it('skips the site breakdown when a specific site was requested', async () => {
    const mySite = objectId();
    mockSiteExistsById(mySite);
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getRmaStatus', { site: String(mySite) });

    expect(result.countsBySite).toBeUndefined();
    expect(mockRmaModel.aggregate).toHaveBeenCalledTimes(1); // just byStatus, no bySite call
  });

  it('scopes getRmaStatus to a createdAt window when days is given', async () => {
    const admin = mockAdminUser();

    await runTool(admin, 'getRmaStatus', { days: 7 });

    const matchStage = mockRmaModel.aggregate.mock.calls[0][0][0].$match;
    expect(matchStage.createdAt.$gte).toBeInstanceOf(Date);
  });

  it('sorts getTicketSummary by duration when sortBy is longestToClose', async () => {
    const target = { _id: objectId(), fullName: 'Sudhansu' };
    mockUserFoundByName(target);
    mockTicketModel.aggregate
      .mockResolvedValueOnce([{ ticketNumber: 'TKT-1', title: 'Slow one', status: 'Closed', priority: 'P2',
        createdAt: new Date('2026-01-01'), closedOn: new Date('2026-01-06'), durationHours: 120 }]) // sample query (longestToClose)
      .mockResolvedValueOnce([]); // byStatus grouping
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getTicketSummary', { forUser: 'Sudhansu', sortBy: 'longestToClose' });

    expect(result.recentTickets[0]).toEqual(
      expect.objectContaining({ ticketNumber: 'TKT-1', hoursToClose: 120 })
    );
    const sampleAggCall = mockTicketModel.aggregate.mock.calls[0][0];
    expect(sampleAggCall).toEqual(expect.arrayContaining([
      { $sort: { durationHours: -1 } }
    ]));
    expect(sampleAggCall[0].$match.closedOn).toEqual({ $ne: null });
  });

  it('scopes getTicketSummary to a createdAt window when days is given', async () => {
    const admin = mockAdminUser();

    await runTool(admin, 'getTicketSummary', { days: 7 });

    const matchStage = mockTicketModel.aggregate.mock.calls[0][0][0].$match;
    expect(matchStage.createdAt.$gte).toBeInstanceOf(Date);
  });

  it('breaks down tickets by site when no specific site was requested', async () => {
    mockTicketModel.aggregate
      .mockResolvedValueOnce([{ _id: 'Open', count: 4 }]) // byStatus
      .mockResolvedValueOnce([{ siteName: 'Head Office', count: 4 }]); // bySite
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getTicketSummary', {});

    expect(result.countsBySite).toEqual([{ siteName: 'Head Office', count: 4 }]);
  });

  it('breaks down spare stock by site when no specific site was requested', async () => {
    mockAssetModel.aggregate
      .mockResolvedValueOnce([{ _id: 'IP Camera', count: 10 }]) // byType
      .mockResolvedValueOnce([{ siteName: 'Head Office', count: 10 }]); // bySite
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getStockLevels', {});

    expect(result.spareStockBySite).toEqual([{ siteName: 'Head Office', count: 10 }]);
  });

  it('filters getRmaStatus to a specific asset', async () => {
    const asset = { _id: objectId() };
    mockAssetModel.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(asset) }) });
    const admin = mockAdminUser();

    await runTool(admin, 'getRmaStatus', { asset: 'CAM-001' });

    const matchStage = mockRmaModel.aggregate.mock.calls[0][0][0].$match;
    expect(matchStage.originalAssetId).toEqual(asset._id);
  });

  it('returns not_found for getRmaStatus when the asset does not match anything', async () => {
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getRmaStatus', { asset: 'NOPE-999' });

    expect(result.error).toBe('not_found');
  });

  it('lets a user filter getRmaStatus to their own RMAs without extra permission', async () => {
    const user = mockL1User();
    mockUserFoundByName({ _id: user._id, fullName: 'Me' });

    const result = await runTool(user, 'getRmaStatus', { forUser: 'Me' });

    expect(result.error).toBeUndefined();
    const matchStage = mockRmaModel.aggregate.mock.calls[0][0][0].$match;
    expect(matchStage.requestedBy).toEqual(user._id);
  });

  it('denies an engineer filtering getRmaStatus to someone else', async () => {
    const user = mockL1User();
    mockUserFoundByName({ _id: objectId(), fullName: 'Someone Else' });

    const result = await runTool(user, 'getRmaStatus', { forUser: 'Someone Else' });

    expect(result).toEqual({ error: 'not_authorized', message: expect.any(String) });
  });

  it('defaults getWorkLogSummary to the current user\'s own log for today', async () => {
    const user = mockL1User();

    const result = await runTool(user, 'getWorkLogSummary', {});

    expect(result.error).toBeUndefined();
    expect(mockWorkLogModel.find).toHaveBeenCalledWith(expect.objectContaining({ userId: user._id }));
    const query = mockWorkLogModel.find.mock.calls[0][0];
    expect(query.date.$gte).toBeInstanceOf(Date); // defaults to "today" with no days/from/to
  });

  it('resolves from/to on getWorkLogSummary to local-midnight bounds on the date field', async () => {
    const user = mockL1User();

    await runTool(user, 'getWorkLogSummary', { from: '2026-08-01', to: '2026-08-31' });

    const query = mockWorkLogModel.find.mock.calls[0][0];
    expect(query.date).toEqual({ $gte: new Date('2026-08-01T00:00:00'), $lte: new Date('2026-08-31T23:59:59.999') });
  });

  it('lets anyone look up their own work log by name without extra permission', async () => {
    const user = mockL1User({ role: 'L1Engineer' });
    mockUserFoundByName({ _id: user._id, fullName: 'Me', role: 'L1Engineer' });

    const result = await runTool(user, 'getWorkLogSummary', { forUser: 'Me' });

    expect(result.error).toBeUndefined();
  });

  it('denies an engineer looking up another engineer\'s work log', async () => {
    const user = mockL1User({ role: 'L1Engineer' });
    mockUserFoundByName({ _id: objectId(), fullName: 'Coworker', role: 'L1Engineer' });

    const result = await runTool(user, 'getWorkLogSummary', { forUser: 'Coworker' });

    expect(result).toEqual({ error: 'not_authorized', message: expect.any(String) });
  });

  it('lets Admin view an engineer\'s work log', async () => {
    mockUserFoundByName({ _id: objectId(), fullName: 'Field Engineer', role: 'L1Engineer' });
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getWorkLogSummary', { forUser: 'Field Engineer', days: 30 });

    expect(result.error).toBeUndefined();
  });

  it('denies Admin viewing another Admin\'s work log (private, even to other Admins)', async () => {
    mockUserFoundByName({ _id: objectId(), fullName: 'Other Admin', role: 'Admin' });
    const admin = mockAdminUser();

    const result = await runTool(admin, 'getWorkLogSummary', { forUser: 'Other Admin' });

    expect(result).toEqual({ error: 'not_authorized', message: expect.any(String) });
  });

  it('returns unknown_tool for a tool name that is not declared', async () => {
    const user = mockL1User();
    const result = await runTool(user, 'deleteEverything', {});
    expect(result).toEqual({ error: 'unknown_tool' });
  });
});
