'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createTimeOffRouter = require('../../../src/modules/timeOff/timeOff.routes');
const createSalaryConfigRouter = require('../../../src/modules/salaryConfig/salaryConfig.routes');
const createAttendanceRouter = require('../../../src/modules/attendance/attendance.routes');
const errorHandler = require('../../../src/core/middleware/errorHandler');
const roles = require('../../../src/core/constants/roles');
const id = 'a'.repeat(24);
const type = { name: 'Leave', code: 'CL', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, isPaid: true, payrollTreatment: 'PAID' };
const structure = { name: 'Regular', code: 'REGULAR' };
const rule = { name: 'Basic', code: 'BASIC', salaryStructureId: id, category: 'BASIC', sequence: 10, calculationType: 'FIXED', fixedAmount: 1000 };

async function fixture(t) {
  const calls = [];
  const service = new Proxy({}, { get(target, method) {
    return async (...args) => {
      calls.push({ method, args });
      return method.startsWith('list') ? { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } } : { id };
    };
  } });
  const app = express();
  app.use(express.json());
  // Test-only authentication stand-in; production routers require Group 1 middleware.
  const authenticate = (req, res, next) => {
    if (req.headers['x-test-role']) req.user = { role: req.headers['x-test-role'], status: req.headers['x-test-status'] || 'ACTIVE' };
    next();
  };
  app.use('/api/v1', createTimeOffRouter({ authenticate, service }), createSalaryConfigRouter({ authenticate, service }), createAttendanceRouter({ authenticate, service }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (role, method, path, body, status) => {
    const headers = { 'content-type': 'application/json' };
    if (role) headers['x-test-role'] = role;
    if (status) headers['x-test-status'] = status;
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, {
      method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  return { calls, request };
}

test('routers refuse to start without shared authentication', () => {
  assert.throws(() => createTimeOffRouter(), /authenticate/);
  assert.throws(() => createSalaryConfigRouter(), /authenticate/);
});

test('every Phase 1 API enforces its role matrix before calling a service', async t => {
  const { request, calls } = await fixture(t);
  const all = Object.values(roles);
  const payrollRead = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
  const payrollWrite = ['HR_PAYROLL_MANAGER', 'ADMIN'];
  const typeWrite = all.filter(role => role !== 'EMPLOYEE');
  const endpoints = [
    ['GET', '/time-off/types', undefined, all],
    ['POST', '/time-off/types', type, typeWrite],
    ['GET', `/time-off/types/${id}`, undefined, all],
    ['PATCH', `/time-off/types/${id}`, { name: 'Updated' }, typeWrite],
    ['POST', `/time-off/types/${id}/deactivate`, undefined, typeWrite],
  ];
  for (const [path, body] of [['structures', structure], ['rules', rule]]) {
    endpoints.push(['GET', `/payroll/${path}`, undefined, payrollRead], ['POST', `/payroll/${path}`, body, payrollWrite],
      ['GET', `/payroll/${path}/${id}`, undefined, payrollRead], ['PATCH', `/payroll/${path}/${id}`, { name: 'Updated' }, payrollWrite],
      ['POST', `/payroll/${path}/${id}/activate`, undefined, payrollWrite], ['POST', `/payroll/${path}/${id}/deactivate`, undefined, payrollWrite],
      ['DELETE', `/payroll/${path}/${id}`, undefined, payrollWrite]);
  }
  for (const [method, path, body, allowed] of endpoints) {
    for (const role of all) {
      const before = calls.length;
      const response = await request(role, method, path, body);
      const accepted = allowed.includes(role);
      assert.equal(response.status, accepted ? (method === 'POST' && body ? 201 : 200) : 403, `${role} ${method} ${path}`);
      assert.equal(calls.length, before + (accepted ? 1 : 0));
      if (!accepted) assert.equal(response.body.code, 'AUTH-003');
    }
  }
});

test('unauthenticated and inactive users are blocked', async t => {
  const { request } = await fixture(t);
  assert.equal((await request(undefined, 'GET', '/time-off/types')).body.code, 'AUTH-002');
  const inactive = await request('ADMIN', 'GET', '/payroll/structures', undefined, 'INACTIVE');
  assert.equal(inactive.status, 403);
  assert.equal(inactive.body.code, 'AUTH-004');
});

test('Employee reads always pass an active-only scope', async t => {
  const { request, calls } = await fixture(t);
  await request('EMPLOYEE', 'GET', '/time-off/types?active=false');
  assert.deepEqual(calls.at(-1).args[1], { activeOnly: true });
  await request('EMPLOYEE', 'GET', `/time-off/types/${id}`);
  assert.deepEqual(calls.at(-1).args[1], { activeOnly: true });
});

test('invalid bodies, IDs and filters never reach services', async t => {
  const { request, calls } = await fixture(t);
  for (const [method, path, body] of [
    ['POST', '/time-off/types', { ...type, unit: 'WEEKS' }],
    ['POST', '/payroll/structures', { name: 'Missing code' }],
    ['POST', '/payroll/rules', { ...rule, calculationType: 'CONTRACT_WAGE' }],
    ['PATCH', `/payroll/structures/${id}`, { active: false }],
    ['GET', '/payroll/structures/not-an-id'],
    ['GET', '/payroll/rules?active=invalid'],
  ]) {
    assert.equal((await request('ADMIN', method, path, body)).status, 400);
  }
  assert.equal(calls.length, 0);
});

test('unexpected errors are sanitized', () => {
  let result;
  const res = { status(value) { assert.equal(value, 500); return this; }, json(value) { result = value; } };
  errorHandler(new Error('mongodb://secret'), {}, res, () => {});
  assert.equal(result.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(result).includes('secret'));
});


test('Phase 2 route permissions and Employee identity payload restrictions', async t => {
  const { request, calls } = await fixture(t);
  const all = Object.values(roles);
  const managers = all.filter(role => role !== 'EMPLOYEE');
  const allocation = { employeeId: id, timeOffTypeId: id, allocatedAmount: 10, validFrom: '2026-01-01', validUntil: '2026-12-31' };
  const leave = { timeOffTypeId: id, startDate: '2026-09-07', endDate: '2026-09-08', reason: 'Leave' };
  const endpoints = [
    ['GET', '/attendance/me', undefined, ['EMPLOYEE']],
    ['POST', '/attendance/check-in', {}, ['EMPLOYEE']],
    ['POST', '/attendance/check-out', {}, ['EMPLOYEE']],
    ['GET', '/attendance', undefined, managers],
    ['POST', '/attendance', { employeeId: id, checkIn: '2026-09-07T09:00:00Z', checkOut: '2026-09-07T18:00:00Z' }, managers],
    ['GET', `/attendance/${id}`, undefined, all],
    ['PATCH', `/attendance/${id}`, { correctionReason: 'Confirmed', checkOut: '2026-09-07T18:00:00Z' }, managers],
    ['GET', '/time-off/allocations/me', undefined, ['EMPLOYEE']],
    ['GET', '/time-off/allocations', undefined, managers],
    ['POST', '/time-off/allocations', allocation, managers],
    ['GET', `/time-off/allocations/${id}`, undefined, all],
    ['PATCH', `/time-off/allocations/${id}`, { allocatedAmount: 12 }, managers],
    ['POST', `/time-off/allocations/${id}/approve`, undefined, managers],
    ['POST', `/time-off/allocations/${id}/cancel`, undefined, managers],
    ['DELETE', `/time-off/allocations/${id}`, undefined, managers],
    ['GET', '/time-off/requests/me', undefined, ['EMPLOYEE']],
    ['GET', '/time-off/requests', undefined, managers],
    ['GET', `/time-off/requests/${id}`, undefined, all],
    ['POST', `/time-off/requests/${id}/approve`, undefined, managers],
    ['POST', `/time-off/requests/${id}/refuse`, { comment: 'Staffing' }, managers],
  ];
  for (const [method, path, body, allowed] of endpoints) {
    for (const role of all) {
      const before = calls.length;
      const result = await request(role, method, path, body);
      const accepted = allowed.includes(role);
      assert.equal(result.status < 300, accepted, `${role} ${method} ${path}`);
      assert.equal(calls.length, before + (accepted ? 1 : 0));
    }
  }
  for (const role of all) {
    const body = role === 'EMPLOYEE' ? leave : { ...leave, employeeId: id };
    assert.equal((await request(role, 'POST', '/time-off/requests', body)).status, 201);
  }
  assert.equal((await request('EMPLOYEE', 'POST', '/attendance/check-in', { employeeId: id })).status, 400);
  assert.equal((await request('EMPLOYEE', 'POST', '/time-off/requests', { ...leave, employeeId: id })).status, 400);
});
