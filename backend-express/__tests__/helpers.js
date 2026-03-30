/**
 * Test helpers for fieldOps controller unit tests.
 * Provides factory functions for mock request/response objects.
 * Uses @jest/globals for ESM compatibility.
 */
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// ────────────────── ObjectId Helper ──────────────────
export const objectId = () => new mongoose.Types.ObjectId();

// ────────────────── Mock Users ──────────────────
export const mockAdminUser = (overrides = {}) => ({
  _id: objectId(),
  name: 'Admin User',
  email: 'admin@test.com',
  role: 'Admin',
  rights: { siteRights: [], globalRights: [] },
  ...overrides,
});

export const mockSupervisorUser = (overrides = {}) => ({
  _id: objectId(),
  name: 'Supervisor User',
  email: 'supervisor@test.com',
  role: 'Supervisor',
  rights: { siteRights: [], globalRights: [] },
  ...overrides,
});

export const mockPMUser = (overrides = {}) => ({
  _id: objectId(),
  name: 'PM User',
  email: 'pm@test.com',
  role: 'PM',
  rights: { siteRights: [], globalRights: [] },
  ...overrides,
});

export const mockVendorUser = (overrides = {}) => ({
  _id: objectId(),
  name: 'Vendor User',
  email: 'vendor@test.com',
  role: 'Vendor',
  rights: { siteRights: [], globalRights: [] },
  ...overrides,
});

export const mockTechnicianUser = (overrides = {}) => ({
  _id: objectId(),
  name: 'Tech User',
  email: 'tech@test.com',
  role: 'Technician',
  rights: { siteRights: [], globalRights: [] },
  ...overrides,
});

// ────────────────── Mock Project ──────────────────
export const mockProject = (overrides = {}) => {
  const pmId = objectId();
  return {
    _id: objectId(),
    projectNumber: 'PRJ-20260320-0001',
    projectName: 'Test Project',
    clientName: 'Test Client',
    description: 'Test project description',
    siteAddress: '123 Test St',
    city: 'TestCity',
    state: 'TestState',
    contractStartDate: new Date('2026-01-01'),
    contractEndDate: new Date('2026-12-31'),
    contractValue: 100000,
    status: 'Active',
    assignedPM: pmId,
    teamMembers: [],
    assignedVendors: [],
    isActive: true,
    createdBy: objectId(),
    ...overrides,
  };
};

// ────────────────── Request / Response Mocks ──────────────────
export const mockReq = ({ user, params = {}, query = {}, body = {}, headers = {} } = {}) => ({
  user: user || mockAdminUser(),
  params,
  query,
  body,
  headers: { authorization: 'Bearer test-token', ...headers },
});

export const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
  };
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json = jest.fn((data) => { res.body = data; return res; });
  return res;
};

export const mockNext = () => jest.fn();

// ────────────────── Chainable Mongoose Mock ──────────────────
/**
 * Creates a chainable mock that mimics Mongoose's query builder pattern.
 * (.populate().sort().skip().limit() etc.) The final resolution is resolveValue.
 */
export const chainableMock = (resolveValue) => {
  const chain = {
    then: (resolve) => Promise.resolve(resolveValue).then(resolve),
    catch: (reject) => Promise.resolve(resolveValue).catch(reject),
  };
  const methods = ['populate', 'sort', 'skip', 'limit', 'select', 'lean', 'exec'];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  return chain;
};
