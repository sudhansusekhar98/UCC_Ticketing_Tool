/**
 * Stock Controller – logMaterialReceipt unit tests (ESM compatible)
 */
import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import { objectId, mockAdminUser, mockPMUser, mockReq, mockRes, mockNext } from '../helpers.js';

const mockProjectStockAllocationModel = {
  findById: jest.fn(),
};

const mockProjectModel = {
  findById: jest.fn(),
};

jest.unstable_mockModule('../../models/ProjectStockAllocation.model.js', () => ({
  default: mockProjectStockAllocationModel,
}));

jest.unstable_mockModule('../../models/Project.model.js', () => ({
  default: mockProjectModel,
}));

let controller;

beforeAll(async () => {
  controller = await import('../../controllers/stock.controller.js');
});

afterEach(() => jest.clearAllMocks());

const buildAllocation = (overrides = {}) => ({
  _id: objectId(),
  projectId: objectId(),
  receivedQty: 0,
  extraQty: 0,
  receiptLog: [],
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const chainablePopulate = (resolveValue) => {
  const chain = {
    then: (resolve) => Promise.resolve(resolveValue).then(resolve),
    catch: (reject) => Promise.resolve(resolveValue).catch(reject),
  };
  chain.populate = jest.fn(() => chain);
  return chain;
};

describe('logMaterialReceipt', () => {
  it('logs a receipt and updates running totals for an Admin user', async () => {
    const allocation = buildAllocation();
    const project = { _id: allocation.projectId, assignedPM: objectId(), teamMembers: [] };

    mockProjectStockAllocationModel.findById
      .mockResolvedValueOnce(allocation)
      .mockReturnValueOnce(chainablePopulate({ _id: allocation._id, receivedQty: 5 }));
    mockProjectModel.findById.mockResolvedValueOnce(project);

    const req = mockReq({
      user: mockAdminUser(),
      params: { id: allocation._id.toString() },
      body: { receivedQty: 5, extraQty: 1, receivedDate: '2026-07-20', modeOfTransport: 'Road', remarks: 'On time' }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(allocation.receivedQty).toBe(5);
    expect(allocation.extraQty).toBe(1);
    expect(allocation.lastModeOfTransport).toBe('Road');
    expect(allocation.receiptLog).toHaveLength(1);
    expect(allocation.save).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('rejects negative receivedQty with 400', async () => {
    const req = mockReq({
      user: mockAdminUser(),
      params: { id: objectId().toString() },
      body: { receivedQty: -1, extraQty: 0 }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(res.statusCode).toBe(400);
    expect(mockProjectStockAllocationModel.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when the allocation does not exist', async () => {
    mockProjectStockAllocationModel.findById.mockResolvedValueOnce(null);

    const req = mockReq({
      user: mockAdminUser(),
      params: { id: objectId().toString() },
      body: { receivedQty: 1, extraQty: 0 }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for a user with no project access', async () => {
    const allocation = buildAllocation();
    const project = { _id: allocation.projectId, assignedPM: objectId(), teamMembers: [] };
    const outsider = { _id: objectId(), role: 'L1Engineer', rights: { siteRights: [], globalRights: [] } };

    mockProjectStockAllocationModel.findById.mockResolvedValueOnce(allocation);
    mockProjectModel.findById.mockResolvedValueOnce(project);

    const req = mockReq({
      user: outsider,
      params: { id: allocation._id.toString() },
      body: { receivedQty: 1, extraQty: 0 }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(res.statusCode).toBe(403);
    expect(allocation.save).not.toHaveBeenCalled();
  });

  it('allows the assigned PM (project team member) to log a receipt', async () => {
    const pmUser = mockPMUser();
    const allocation = buildAllocation();
    const project = { _id: allocation.projectId, assignedPM: pmUser._id, teamMembers: [] };

    mockProjectStockAllocationModel.findById
      .mockResolvedValueOnce(allocation)
      .mockReturnValueOnce(chainablePopulate({ _id: allocation._id }));
    mockProjectModel.findById.mockResolvedValueOnce(project);

    const req = mockReq({
      user: pmUser,
      params: { id: allocation._id.toString() },
      body: { receivedQty: 2, extraQty: 0 }
    });
    const res = mockRes();

    await controller.logMaterialReceipt(req, res, mockNext());

    expect(res.body.success).toBe(true);
    expect(allocation.save).toHaveBeenCalled();
  });
});
