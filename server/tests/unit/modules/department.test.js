'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createStore = require('../../fixtures/configurationStore');
const Department = require('../../../src/modules/departments/department.model');
const { createDepartmentService } = require('../../../src/modules/departments/department.service');
const createDepartmentRouter = require('../../../src/modules/departments/department.routes');
const errorHandler = require('../../../src/core/middleware/errorHandler');
const roles = require('../../../src/core/constants/roles');

const id = 'a'.repeat(24);
const managerId = 'b'.repeat(24);
const rejectsCode = (work, code) => assert.rejects(work, error => error.code === code);

test('Department schema declares Employee manager and unique code', () => {
  assert.equal(Department.schema.path('manager').options.ref, 'Employee');
  assert.equal(Department.schema.path('active').options.default, true);
  assert.ok(Department.schema.indexes().some(([keys, options]) => keys.code === 1 && options.unique));
});

test('Department create normalizes code and rejects duplicates', async () => {
  const store = createStore();
  const service = createDepartmentService({ Model: store.model(['code']) });
  const created = await service.createDepartment({ name: 'Engineering', code: 'eng', managerId });
  assert.equal(created.code, 'ENG');
  assert.equal(created.manager, managerId);
  assert.equal(created.active, true);
  await rejectsCode(() => service.createDepartment({ name: 'Duplicate', code: 'eng' }), 'DUPLICATE_CODE');
});

test('Department list supports literal search, active filter, and pagination', async () => {
  const store = createStore();
  const service = createDepartmentService({ Model: store.model(['code']) });
  const engineering = await service.createDepartment({ name: 'Engineering .*', code: 'ENG' });
  await service.createDepartment({ name: 'Finance', code: 'FIN' });
  await service.deactivateDepartment(engineering._id);
  const searched = await service.listDepartments({ q: '.*', page: 1, limit: 20 });
  assert.equal(searched.meta.total, 1);
  assert.equal(searched.data[0].code, 'ENG');
  const active = await service.listDepartments({ active: true, page: 1, limit: 1 });
  assert.equal(active.meta.total, 1);
  assert.equal(active.data[0].code, 'FIN');
});

test('Department get, update, manager clearing, and deactivate work', async () => {
  const store = createStore();
  const service = createDepartmentService({ Model: store.model(['code']) });
  const created = await service.createDepartment({ name: 'Engineering', code: 'ENG', managerId });
  assert.equal((await service.getDepartment(created._id)).name, 'Engineering');
  const updated = await service.updateDepartment(created._id, {
    name: 'Product Engineering', code: 'prod_eng', description: 'Product team', managerId: null,
  });
  assert.equal(updated.code, 'PROD_ENG');
  assert.equal(updated.manager, null);
  assert.equal((await service.deactivateDepartment(created._id)).active, false);
  await rejectsCode(() => service.getDepartment(id), 'RESOURCE_NOT_FOUND');
});

async function httpFixture(t) {
  const calls = [];
  const service = new Proxy({}, { get(target, method) {
    return async (...args) => {
      calls.push({ method, args });
      return method === 'listDepartments'
        ? { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }
        : { id };
    };
  } });
  const authenticate = (req, res, next) => {
    req.user = { role: req.headers['x-test-role'], status: 'ACTIVE' };
    next();
  };
  const app = express();
  app.use(express.json());
  app.use('/api/v1/departments', createDepartmentRouter({ authenticate, service }));
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
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/departments${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-test-role': role },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  return { calls, request };
}

test('Department routes enforce RBAC and validate requests', async t => {
  const { calls, request } = await httpFixture(t);
  const permitted = [roles.HR_MANAGER, roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN];
  const endpoints = [
    ['GET', '', undefined, 200],
    ['POST', '', { name: 'Engineering', code: 'eng' }, 201],
    ['GET', `/${id}`, undefined, 200],
    ['PATCH', `/${id}`, { name: 'Product' }, 200],
    ['POST', `/${id}/deactivate`, undefined, 200],
  ];
  for (const [method, path, body, expected] of endpoints) {
    for (const role of permitted) assert.equal((await request(role, method, path, body)).status, expected);
    const before = calls.length;
    const forbidden = await request(roles.EMPLOYEE, method, path, body);
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.code, 'AUTH-003');
    assert.equal(calls.length, before);
  }
  assert.equal((await request(roles.ADMIN, 'PATCH', `/${id}`, { active: false })).status, 400);
  assert.equal((await request(roles.ADMIN, 'GET', '?active=no')).status, 400);
  assert.equal((await request(roles.ADMIN, 'GET', '/invalid')).status, 400);
  const createCall = calls.find(call => call.method === 'createDepartment');
  assert.equal(createCall.args[0].code, 'ENG');
});
