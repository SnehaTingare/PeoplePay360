'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createStore = require('../../fixtures/configurationStore');
const Employee = require('../../../src/modules/employees/employee.model');
const validation = require('../../../src/modules/employees/employee.validation');
const { createEmployeeService } = require('../../../src/modules/employees/employee.service');
const createEmployeeRouter = require('../../../src/modules/employees/employee.routes');
const errorHandler = require('../../../src/core/middleware/errorHandler');
const roles = require('../../../src/core/constants/roles');

const departmentId = 'a'.repeat(24);
const scheduleId = 'b'.repeat(24);
const userId = 'c'.repeat(24);
const missingId = 'f'.repeat(24);
const input = {
  firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@company.com', phone: '9999999999',
  departmentId, jobPosition: 'Software Engineer', employeeType: 'FULL_TIME',
  workingScheduleId: scheduleId, joiningDate: new Date('2026-07-01T00:00:00.000Z'),
};
const rejectsCode = (work, code) => assert.rejects(work, error => error.code === code);
const throwsCode = (work, code) => assert.throws(work, error => error.code === code);

function fixture() {
  const store = createStore();
  const Model = store.model(['email']);
  Model.findById = employeeId => Model.findOne({ _id: employeeId });
  const departments = { getDepartment: async id => {
    if (id !== departmentId) throw Object.assign(new Error('missing'), { code: 'RESOURCE_NOT_FOUND' });
    return { id };
  } };
  const schedules = { getSchedule: async id => {
    if (id !== scheduleId) throw Object.assign(new Error('missing'), { code: 'RESOURCE_NOT_FOUND' });
    return { id };
  } };
  const users = { findById: async id => id === userId ? { _id: id } : null };
  return { Model, service: createEmployeeService({ Model, departments, schedules, users }) };
}

test('Employee schema declares unique identifiers and relationships', () => {
  assert.equal(Employee.schema.path('department').options.ref, 'Department');
  assert.equal(Employee.schema.path('workingSchedule').options.ref, 'WorkingSchedule');
  assert.equal(Employee.schema.path('manager').options.ref, 'Employee');
  assert.equal(Employee.schema.path('user').options.ref, 'User');
  assert.ok(Employee.schema.indexes().some(([keys, options]) => keys.employeeId === 1 && options.unique));
  assert.ok(Employee.schema.indexes().some(([keys, options]) => keys.email === 1 && options.unique));
});

test('Employee creates with generated ID, normalized data, and valid relationships', async () => {
  const { service } = fixture();
  const employee = await service.createEmployee({ ...input, userId, bankDetails: {
    accountHolderName: 'Rahul Sharma', accountNumber: '1234', bankName: 'Example Bank', ifscCode: 'exam0001',
  } });
  assert.match(employee.employeeId, /^PP360-E-[A-F0-9]{8}$/);
  assert.equal(employee.email, input.email);
  assert.equal(employee.user, userId);
  assert.equal(employee.department, departmentId);
  assert.equal(employee.workingSchedule, scheduleId);
  assert.equal(employee.employmentStatus, 'ACTIVE');
});

test('Employee rejects duplicate email and missing department/position', async () => {
  const { service } = fixture();
  await service.createEmployee(input);
  await rejectsCode(() => service.createEmployee({ ...input, firstName: 'Other' }), 'EMP-001');
  throwsCode(() => validation.validateCreate({ body: { ...input, departmentId: undefined } }), 'EMP-003');
  throwsCode(() => validation.validateCreate({ body: { ...input, jobPosition: '' } }), 'EMP-003');
});

test('Employee validates Department, Schedule, User, Manager, and unique User linkage', async () => {
  const { service } = fixture();
  await rejectsCode(() => service.createEmployee({ ...input, departmentId: missingId }), 'RESOURCE_NOT_FOUND');
  await rejectsCode(() => service.createEmployee({ ...input, workingScheduleId: missingId }), 'RESOURCE_NOT_FOUND');
  await rejectsCode(() => service.createEmployee({ ...input, userId: missingId }), 'RESOURCE_NOT_FOUND');
  await rejectsCode(() => service.createEmployee({ ...input, managerId: missingId }), 'RESOURCE_NOT_FOUND');
  await service.createEmployee({ ...input, userId });
  await rejectsCode(() => service.createEmployee({ ...input, email: 'other@company.com', userId }), 'RESOURCE_CONFLICT');
});

test('Employee cannot become their own manager', async () => {
  const { service } = fixture();
  const employee = await service.createEmployee(input);
  await rejectsCode(() => service.updateEmployee(employee._id, { managerId: employee._id }), 'EMP-002');
});

test('Employee list/search/filter, update, and lifecycle preserve records', async () => {
  const { service, Model } = fixture();
  const manager = await service.createEmployee(input);
  const report = await service.createEmployee({ ...input, email: 'anita@company.com', firstName: 'Anita', employeeType: 'PART_TIME', managerId: manager._id });
  const updated = await service.updateEmployee(report._id, { phone: '8888888888', jobPosition: 'Senior Engineer' });
  assert.equal(updated.phone, '8888888888');
  assert.equal((await service.listEmployees({ q: 'anita', page: 1, limit: 20 })).meta.total, 1);
  assert.equal((await service.listEmployees({ departmentId, employeeType: 'PART_TIME', managerId: manager._id, employmentStatus: 'ACTIVE', page: 1, limit: 20 })).meta.total, 1);
  await service.deactivateEmployee(report._id);
  assert.equal((await service.listEmployees({ employmentStatus: 'INACTIVE', page: 1, limit: 20 })).meta.total, 1);
  assert.equal(Model.rows.size, 2);
  assert.equal((await service.activateEmployee(report._id)).employmentStatus, 'ACTIVE');
});

test('Employee /me derives linkage and ownership violations use EMP-005', async () => {
  const { service } = fixture();
  const own = await service.createEmployee(input);
  const actor = { employeeId: own._id };
  assert.equal((await service.getOwnEmployee(actor))._id, own._id);
  assert.equal((await service.assertOwnership(own._id, actor))._id, own._id);
  await rejectsCode(() => service.assertOwnership(missingId, actor), 'EMP-005');
  await rejectsCode(() => service.getOwnEmployee({}), 'RESOURCE_NOT_FOUND');
});

async function httpFixture(t) {
  const calls = [];
  const service = new Proxy({}, { get(target, method) {
    return async (...args) => {
      calls.push({ method, args });
      return method === 'listEmployees'
        ? { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }
        : { id: missingId };
    };
  } });
  const authenticate = (req, res, next) => {
    req.user = { role: req.headers['x-test-role'], status: 'ACTIVE', employeeId: missingId };
    next();
  };
  const app = express();
  app.use(express.json());
  app.use('/api/v1/employees', createEmployeeRouter({ authenticate, service }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const request = async (role, method, path = '', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/employees${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-test-role': role },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  return { calls, request };
}

test('Employee routes enforce management RBAC and exclusive /me access', async t => {
  const { calls, request } = await httpFixture(t);
  const managers = [roles.HR_MANAGER, roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN];
  const body = { ...input, joiningDate: '2026-07-01' };
  const endpoints = [
    ['GET', '', undefined, 200], ['POST', '', body, 201], ['GET', `/${missingId}`, undefined, 200],
    ['PATCH', `/${missingId}`, { phone: '8888888888' }, 200],
    ['POST', `/${missingId}/activate`, undefined, 200], ['POST', `/${missingId}/deactivate`, undefined, 200],
  ];
  for (const [method, path, payload, expected] of endpoints) {
    for (const role of managers) assert.equal((await request(role, method, path, payload)).status, expected);
    const before = calls.length;
    const forbidden = await request(roles.EMPLOYEE, method, path, payload);
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.code, 'AUTH-003');
    assert.equal(calls.length, before);
  }
  assert.equal((await request(roles.EMPLOYEE, 'GET', '/me')).status, 200);
  assert.equal((await request(roles.ADMIN, 'GET', '/me')).status, 403);
  assert.equal((await request(roles.ADMIN, 'PATCH', `/${missingId}`, { employmentStatus: 'INACTIVE' })).status, 400);
});
