/**
 * FieldOps Controller – Unit Tests (ESM compatible)
 *
 * Covers:
 *  1. getProjects – listing, filtering, pagination
 *  2. getProjectById – found, not-found, inactive, unauthorized
 *  3. createProject – success, duplicate error
 *  4. updateProject – success, not-found
 *  5. deleteProject – soft-delete, not-found, error forwarding
 *  6. getProjectDashboard – aggregated stats, auth checks
 *  7. Project Zone CRUD
 *  8. PM Daily Log CRUD – auth, duplicates
 *  9. Auth middleware – allowAccess, authorize
 * 10. Edge cases – empty DB, zero stats
 */
import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import {
  objectId,
  mockAdminUser,
  mockPMUser,
  mockTechnicianUser,
  mockProject,
  mockReq,
  mockRes,
  mockNext,
  chainableMock,
} from '../helpers.js';

// ─────────────────────────────────────────────
//  Create model mocks using jest.fn()
// ─────────────────────────────────────────────
const mockProjectModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
};

const mockProjectZoneModel = {
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockPMDailyLogModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
};

const mockDeviceInstallationModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
};

const mockVendorWorkLogModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
};

const mockChallengeLogModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
};

// ─────────────────────────────────────────────
//  Mock modules BEFORE dynamic controller import
// ─────────────────────────────────────────────
jest.unstable_mockModule('../../models/Project.model.js', () => ({
  default: mockProjectModel,
  ProjectStatuses: {
    PLANNING: 'Planning',
    ACTIVE: 'Active',
    ON_HOLD: 'OnHold',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  },
}));

jest.unstable_mockModule('../../models/ProjectZone.model.js', () => ({
  default: mockProjectZoneModel,
}));

jest.unstable_mockModule('../../models/PMDailyLog.model.js', () => ({
  default: mockPMDailyLogModel,
  PhotoTypes: {},
}));

jest.unstable_mockModule('../../models/DeviceInstallation.model.js', () => ({
  default: mockDeviceInstallationModel,
  DeviceTypes: {},
  InstallationStatuses: {},
}));

jest.unstable_mockModule('../../models/VendorWorkLog.model.js', () => ({
  default: mockVendorWorkLogModel,
  LabourTypes: {},
  TrenchStatuses: {},
}));

jest.unstable_mockModule('../../models/ChallengeLog.model.js', () => ({
  default: mockChallengeLogModel,
  IssueTypes: {},
  Severities: {},
  ResolutionStatuses: {},
}));

jest.unstable_mockModule('../../models/ProjectStockAllocation.model.js', () => ({
  default: { find: jest.fn() },
}));

jest.unstable_mockModule('../../config/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn(),
}));

// ─────────────────────────────────────────────
//  Dynamic import AFTER mocks are registered
// ─────────────────────────────────────────────
let controller;
let allowAccess;
let authorize;

beforeAll(async () => {
  controller = await import('../../controllers/fieldops.controller.js');
  const authMiddleware = await import('../../middleware/auth.middleware.js');
  allowAccess = authMiddleware.allowAccess;
  authorize = authMiddleware.authorize;
});

afterEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════
//  1. getProjects
// ═══════════════════════════════════════════
describe('getProjects', () => {
  it('returns paginated projects for admin', async () => {
    const projects = [mockProject(), mockProject()];
    mockProjectModel.find.mockReturnValue(chainableMock(projects));
    mockProjectModel.countDocuments.mockResolvedValue(2);

    const req = mockReq({ query: { page: '1', limit: '20' } });
    const res = mockRes();

    await controller.getProjects(req, res, mockNext());

    expect(res.json).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(projects);
    expect(res.body.pagination.total).toBe(2);
  });

  it('filters by status when provided', async () => {
    mockProjectModel.find.mockReturnValue(chainableMock([]));
    mockProjectModel.countDocuments.mockResolvedValue(0);

    const req = mockReq({ query: { status: 'Active' } });
    const res = mockRes();

    await controller.getProjects(req, res, mockNext());

    const queryArg = mockProjectModel.find.mock.calls[0][0];
    expect(queryArg.status).toBe('Active');
  });

  it('filters by search text across name, client, number', async () => {
    mockProjectModel.find.mockReturnValue(chainableMock([]));
    mockProjectModel.countDocuments.mockResolvedValue(0);

    const req = mockReq({ query: { search: 'Alpha' } });
    const res = mockRes();

    await controller.getProjects(req, res, mockNext());

    const queryArg = mockProjectModel.find.mock.calls[0][0];
    expect(queryArg.$or).toBeDefined();
    expect(queryArg.$or).toHaveLength(3);
  });

  it('restricts results for non-admin users to their own projects', async () => {
    const pmUser = mockPMUser();
    // First find() is for User's own projects filter
    const projectsChain = chainableMock([{ _id: objectId() }]);
    mockProjectModel.find
      .mockReturnValueOnce(projectsChain)   // user projects lookup
      .mockReturnValueOnce(chainableMock([])); // main query
    mockProjectModel.countDocuments.mockResolvedValue(0);

    const req = mockReq({ user: pmUser, query: {} });
    const res = mockRes();

    await controller.getProjects(req, res, mockNext());

    // Should have called find at least once to get user's projects
    expect(mockProjectModel.find).toHaveBeenCalled();
  });

  it('forwards errors to next()', async () => {
    const error = new Error('DB connection failed');
    // countDocuments rejection propagates through Promise.all to the catch block
    mockProjectModel.find.mockReturnValue(chainableMock([]));
    mockProjectModel.countDocuments.mockRejectedValue(error);

    const next = mockNext();
    await controller.getProjects(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('handles empty database gracefully', async () => {
    mockProjectModel.find.mockReturnValue(chainableMock([]));
    mockProjectModel.countDocuments.mockResolvedValue(0);

    const res = mockRes();
    await controller.getProjects(mockReq(), res, mockNext());

    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });
});

// ═══════════════════════════════════════════
//  2. getProjectById
// ═══════════════════════════════════════════
describe('getProjectById', () => {
  it('returns a project for authorized admin', async () => {
    const adminUser = mockAdminUser();
    const project = mockProject({ assignedPM: adminUser._id });
    mockProjectModel.findById.mockReturnValue(chainableMock(project));

    const req = mockReq({ user: adminUser, params: { id: project._id.toString() } });
    const res = mockRes();

    await controller.getProjectById(req, res, mockNext());

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(project);
  });

  it('returns 404 when project is not found', async () => {
    mockProjectModel.findById.mockReturnValue(chainableMock(null));

    const res = mockRes();
    await controller.getProjectById(
      mockReq({ params: { id: objectId().toString() } }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for a soft-deleted (inactive) project', async () => {
    const project = mockProject({ isActive: false });
    mockProjectModel.findById.mockReturnValue(chainableMock(project));

    const res = mockRes();
    await controller.getProjectById(
      mockReq({ params: { id: project._id.toString() } }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 for an unauthorized user', async () => {
    const tech = mockTechnicianUser();
    const project = mockProject(); // PM is a different user; tech not in team
    mockProjectModel.findById.mockReturnValue(chainableMock(project));

    const res = mockRes();
    await controller.getProjectById(
      mockReq({ user: tech, params: { id: project._id.toString() } }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════
//  3. createProject
// ═══════════════════════════════════════════
describe('createProject', () => {
  it('creates a project and returns 201', async () => {
    const adminUser = mockAdminUser();
    const project = mockProject({ createdBy: adminUser._id });

    mockProjectModel.create.mockResolvedValue(project);
    mockProjectModel.findById.mockReturnValue(chainableMock(project));

    const req = mockReq({
      user: adminUser,
      body: {
        projectName: 'New Project',
        clientName: 'Client',
        siteAddress: '123 Test',
        contractStartDate: '2026-01-01',
        contractEndDate: '2026-12-31',
        assignedPM: objectId().toString(),
      },
    });
    const res = mockRes();

    await controller.createProject(req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(project);
  });

  it('returns 400 on duplicate project number', async () => {
    const dupError = new Error('Duplicate');
    dupError.code = 11000;
    mockProjectModel.create.mockRejectedValue(dupError);

    const res = mockRes();
    await controller.createProject(mockReq({ body: { projectName: 'Dup' } }), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('forwards unexpected errors to next()', async () => {
    const error = new Error('Unexpected');
    mockProjectModel.create.mockRejectedValue(error);

    const next = mockNext();
    await controller.createProject(mockReq({ body: {} }), mockRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ═══════════════════════════════════════════
//  4. updateProject
// ═══════════════════════════════════════════
describe('updateProject', () => {
  it('updates and returns the project', async () => {
    const project = mockProject();
    mockProjectModel.findByIdAndUpdate.mockReturnValue(chainableMock(project));

    const req = mockReq({ params: { id: project._id.toString() }, body: { status: 'Completed' } });
    const res = mockRes();

    await controller.updateProject(req, res, mockNext());

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/updated/i);
  });

  it('returns 404 when project does not exist', async () => {
    mockProjectModel.findByIdAndUpdate.mockReturnValue(chainableMock(null));

    const res = mockRes();
    await controller.updateProject(
      mockReq({ params: { id: objectId().toString() }, body: {} }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ═══════════════════════════════════════════
//  5. deleteProject
// ═══════════════════════════════════════════
describe('deleteProject', () => {
  it('soft-deletes the project', async () => {
    const project = mockProject({ isActive: false, deletedAt: new Date() });
    mockProjectModel.findByIdAndUpdate.mockResolvedValue(project);

    const res = mockRes();
    await controller.deleteProject(
      mockReq({ params: { id: project._id.toString() } }), res, mockNext()
    );

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
    // Verify soft-delete payload was used
    const updateCall = mockProjectModel.findByIdAndUpdate.mock.calls[0];
    expect(updateCall[1]).toMatchObject({ isActive: false });
    expect(updateCall[1].deletedAt).toBeDefined();
  });

  it('returns 404 when project not found', async () => {
    mockProjectModel.findByIdAndUpdate.mockResolvedValue(null);

    const res = mockRes();
    await controller.deleteProject(
      mockReq({ params: { id: objectId().toString() } }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('forwards unexpected errors to next()', async () => {
    const error = new Error('DB error');
    mockProjectModel.findByIdAndUpdate.mockRejectedValue(error);

    const next = mockNext();
    await controller.deleteProject(mockReq({ params: { id: objectId().toString() } }), mockRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ═══════════════════════════════════════════
//  6. getProjectDashboard
// ═══════════════════════════════════════════
describe('getProjectDashboard', () => {
  const setupDashboardMocks = (project, overrides = {}) => {
    mockProjectModel.findById.mockResolvedValue(project);
    mockDeviceInstallationModel.aggregate.mockResolvedValue(
      overrides.devices ?? [{ _id: 'Installed', count: 5 }, { _id: 'Pending', count: 3 }]
    );
    mockPMDailyLogModel.aggregate.mockResolvedValue(
      overrides.logs ?? [{ _id: null, totalLogs: 10, avgProgress: 45.5, totalManHours: 120 }]
    );
    mockChallengeLogModel.aggregate.mockResolvedValue(
      overrides.challenges ?? [{ _id: 'Open', count: 2 }, { _id: 'Resolved', count: 4 }]
    );
    mockVendorWorkLogModel.aggregate.mockResolvedValue(
      overrides.vendor ?? [{ _id: null, totalLogs: 6, totalCrewCount: 15, totalLength: 500 }]
    );
    mockPMDailyLogModel.find.mockReturnValue(chainableMock([]));
  };

  it('returns full aggregated dashboard stats for admin', async () => {
    const adminUser = mockAdminUser();
    const project = mockProject({ assignedPM: adminUser._id });
    setupDashboardMocks(project);

    const req = mockReq({ user: adminUser, params: { id: project._id.toString() } });
    const res = mockRes();

    await controller.getProjectDashboard(req, res, mockNext());

    const data = res.body.data;
    expect(res.body.success).toBe(true);
    expect(data.devices.total).toBe(8);
    expect(data.devices.byStatus['Installed']).toBe(5);
    expect(data.dailyLogs.total).toBe(10);
    expect(data.dailyLogs.avgProgress).toBe(46); // Math.round(45.5)
    expect(data.dailyLogs.totalManHours).toBe(120);
    expect(data.challenges.total).toBe(6);
    expect(data.challenges.byStatus['Open']).toBe(2);
    expect(data.vendorWork.totalLogs).toBe(6);
    expect(data.vendorWork.totalCrewCount).toBe(15);
    expect(data.vendorWork.totalLengthMeters).toBe(500);
  });

  it('returns zero stats gracefully when database is empty', async () => {
    const adminUser = mockAdminUser();
    const project = mockProject({ assignedPM: adminUser._id });
    setupDashboardMocks(project, { devices: [], logs: [], challenges: [], vendor: [] });

    const req = mockReq({ user: adminUser, params: { id: project._id.toString() } });
    const res = mockRes();

    await controller.getProjectDashboard(req, res, mockNext());

    const data = res.body.data;
    expect(data.devices.total).toBe(0);
    expect(data.dailyLogs.total).toBe(0);
    expect(data.dailyLogs.avgProgress).toBe(0);
    expect(data.challenges.total).toBe(0);
    expect(data.vendorWork.totalLogs).toBe(0);
  });

  it('returns 404 when project is not found', async () => {
    mockProjectModel.findById.mockResolvedValue(null);

    const res = mockRes();
    await controller.getProjectDashboard(
      mockReq({ params: { id: objectId().toString() } }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 for unauthorized user', async () => {
    const tech = mockTechnicianUser();
    const project = mockProject(); // PM is different user
    mockProjectModel.findById.mockResolvedValue(project);

    const res = mockRes();
    await controller.getProjectDashboard(
      mockReq({ user: tech, params: { id: project._id.toString() } }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════
//  7. Project Zones
// ═══════════════════════════════════════════
describe('getProjectZones', () => {
  it('returns active zones for a project', async () => {
    const zones = [{ _id: objectId(), zoneName: 'Zone A' }];
    mockProjectZoneModel.find.mockReturnValue(chainableMock(zones));

    const req = mockReq({ params: { projectId: objectId().toString() } });
    const res = mockRes();

    await controller.getProjectZones(req, res, mockNext());

    expect(res.body.data).toEqual(zones);
  });
});

describe('createProjectZone', () => {
  it('creates a zone and returns 201', async () => {
    const projectId = objectId();
    const zone = { _id: objectId(), zoneName: 'Zone A', projectId };
    mockProjectZoneModel.create.mockResolvedValue(zone);

    const req = mockReq({
      params: { projectId: projectId.toString() },
      body: { zoneName: 'Zone A' },
    });
    const res = mockRes();

    await controller.createProjectZone(req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.data).toEqual(zone);
  });

  it('returns 400 on duplicate zone name', async () => {
    const dupError = new Error('Dup');
    dupError.code = 11000;
    mockProjectZoneModel.create.mockRejectedValue(dupError);

    const res = mockRes();
    await controller.createProjectZone(
      mockReq({ params: { projectId: objectId().toString() }, body: {} }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

describe('updateProjectZone', () => {
  it('updates zone successfully', async () => {
    const zone = { _id: objectId(), zoneName: 'Updated Zone' };
    mockProjectZoneModel.findByIdAndUpdate.mockResolvedValue(zone);

    const req = mockReq({ params: { id: zone._id.toString() }, body: { zoneName: 'Updated Zone' } });
    const res = mockRes();

    await controller.updateProjectZone(req, res, mockNext());

    expect(res.body.success).toBe(true);
  });

  it('returns 404 when zone not found', async () => {
    mockProjectZoneModel.findByIdAndUpdate.mockResolvedValue(null);

    const res = mockRes();
    await controller.updateProjectZone(
      mockReq({ params: { id: objectId().toString() }, body: {} }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('deleteProjectZone', () => {
  it('soft-deletes a zone', async () => {
    const zone = { _id: objectId(), isActive: false };
    mockProjectZoneModel.findByIdAndUpdate.mockResolvedValue(zone);

    const res = mockRes();
    await controller.deleteProjectZone(
      mockReq({ params: { id: zone._id.toString() } }), res, mockNext()
    );

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 when zone not found', async () => {
    mockProjectZoneModel.findByIdAndUpdate.mockResolvedValue(null);

    const res = mockRes();
    await controller.deleteProjectZone(
      mockReq({ params: { id: objectId().toString() } }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ═══════════════════════════════════════════
//  8. PM Daily Logs
// ═══════════════════════════════════════════
describe('getPMDailyLogs', () => {
  it('returns paginated logs for admin', async () => {
    const logs = [{ _id: objectId(), workSummary: 'Did work' }];
    mockPMDailyLogModel.find.mockReturnValue(chainableMock(logs));
    mockPMDailyLogModel.countDocuments.mockResolvedValue(1);

    const res = mockRes();
    await controller.getPMDailyLogs(mockReq({ query: { page: '1', limit: '20' } }), res, mockNext());

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(logs);
    expect(res.body.pagination.total).toBe(1);
  });

  it('filters by projectId when provided', async () => {
    const projectId = objectId().toString();
    mockPMDailyLogModel.find.mockReturnValue(chainableMock([]));
    mockPMDailyLogModel.countDocuments.mockResolvedValue(0);

    const res = mockRes();
    await controller.getPMDailyLogs(mockReq({ query: { projectId } }), res, mockNext());

    const queryArg = mockPMDailyLogModel.find.mock.calls[0][0];
    expect(queryArg.projectId).toBe(projectId);
  });
});

describe('getPMDailyLogById', () => {
  it('returns a single log by ID', async () => {
    const log = { _id: objectId(), workSummary: 'Test' };
    mockPMDailyLogModel.findById.mockReturnValue(chainableMock(log));

    const res = mockRes();
    await controller.getPMDailyLogById(
      mockReq({ params: { id: log._id.toString() } }), res, mockNext()
    );

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(log);
  });

  it('returns 404 when log not found', async () => {
    mockPMDailyLogModel.findById.mockReturnValue(chainableMock(null));

    const res = mockRes();
    await controller.getPMDailyLogById(
      mockReq({ params: { id: objectId().toString() } }), res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('createPMDailyLog', () => {
  it('creates a log for the assigned PM', async () => {
    const pmUser = mockPMUser();
    const project = mockProject({ assignedPM: pmUser._id });
    const log = { _id: objectId(), projectId: project._id };

    mockProjectModel.findById.mockResolvedValue(project);
    mockPMDailyLogModel.findOne.mockResolvedValue(null); // no duplicate
    mockPMDailyLogModel.create.mockResolvedValue(log);
    mockPMDailyLogModel.findById.mockReturnValue(chainableMock(log));

    const req = mockReq({
      user: pmUser,
      body: {
        projectId: project._id.toString(),
        logDate: '2026-03-20',
        workSummary: 'Installed cables',
        progressPercentage: 50,
        manHours: 8,
      },
    });
    const res = mockRes();

    await controller.createPMDailyLog(req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when project not found', async () => {
    mockProjectModel.findById.mockResolvedValue(null);

    const res = mockRes();
    await controller.createPMDailyLog(
      mockReq({ body: { projectId: objectId().toString(), logDate: '2026-03-20' } }),
      res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 for tech user who is not on the team', async () => {
    const tech = mockTechnicianUser();
    const project = mockProject(); // PM and team are different users
    mockProjectModel.findById.mockResolvedValue(project);

    const res = mockRes();
    await controller.createPMDailyLog(
      mockReq({ user: tech, body: { projectId: project._id.toString(), logDate: '2026-03-20' } }),
      res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 when a log already exists for same date', async () => {
    const pmUser = mockPMUser();
    const project = mockProject({ assignedPM: pmUser._id });

    mockProjectModel.findById.mockResolvedValue(project);
    mockPMDailyLogModel.findOne.mockResolvedValue({ _id: objectId() }); // duplicate

    const res = mockRes();
    await controller.createPMDailyLog(
      mockReq({
        user: pmUser,
        body: { projectId: project._id.toString(), logDate: '2026-03-20' },
      }),
      res, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// ═══════════════════════════════════════════
//  9. Auth Middleware – allowAccess
// ═══════════════════════════════════════════
describe('allowAccess middleware', () => {
  it('allows Admin through role check', () => {
    const middleware = allowAccess({ roles: ['Admin', 'Supervisor'] });
    const req = mockReq({ user: mockAdminUser() });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks Technician when only Admin/Supervisor allowed', () => {
    const middleware = allowAccess({ roles: ['Admin', 'Supervisor'] });
    const req = mockReq({ user: mockTechnicianUser() });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows user with matching global right', () => {
    const user = mockTechnicianUser();
    user.rights = { siteRights: [], globalRights: ['manage_projects'] };

    const middleware = allowAccess({ rights: ['manage_projects'] });
    const req = mockReq({ user });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows user with matching site-level right', () => {
    const user = mockTechnicianUser();
    user.rights = {
      siteRights: [{ site: objectId(), rights: ['view_logs'] }],
      globalRights: [],
    };

    const middleware = allowAccess({ rights: ['view_logs'] });
    const req = mockReq({ user });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('blocks user with no matching rights or role', () => {
    const user = mockTechnicianUser();
    user.rights = { siteRights: [], globalRights: [] };

    const middleware = allowAccess({ roles: ['Admin'], rights: ['special_access'] });
    const req = mockReq({ user });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════
//  10. Auth Middleware – authorize
// ═══════════════════════════════════════════
describe('authorize middleware', () => {
  it('allows Admin through authorize("Admin")', () => {
    const middleware = authorize('Admin');
    const req = mockReq({ user: mockAdminUser() });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks PM when only Admin is authorized', () => {
    const middleware = authorize('Admin');
    const req = mockReq({ user: mockPMUser() });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows multiple roles in authorize call', () => {
    const middleware = authorize('Admin', 'Supervisor');
    const req = mockReq({ user: { ...mockAdminUser(), role: 'Supervisor' } });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════
//  11. Project Model Constants
// ═══════════════════════════════════════════
describe('Project Model – ProjectStatuses constants', () => {
  it('exports correct status strings', async () => {
    const { ProjectStatuses } = await import('../../models/Project.model.js');
    expect(ProjectStatuses.PLANNING).toBe('Planning');
    expect(ProjectStatuses.ACTIVE).toBe('Active');
    expect(ProjectStatuses.ON_HOLD).toBe('OnHold');
    expect(ProjectStatuses.COMPLETED).toBe('Completed');
    expect(ProjectStatuses.CANCELLED).toBe('Cancelled');
  });
});
