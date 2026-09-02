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
jest.unstable_mockModule('../../models/Asset.model.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/RMARequest.model.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/User.model.js', () => ({ default: mockUserModel }));

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

  it('returns unknown_tool for a tool name that is not declared', async () => {
    const user = mockL1User();
    const result = await runTool(user, 'deleteEverything', {});
    expect(result).toEqual({ error: 'unknown_tool' });
  });
});
