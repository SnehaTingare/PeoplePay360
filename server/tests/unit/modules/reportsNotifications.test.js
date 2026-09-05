'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const createStore = require('../../fixtures/configurationStore');
const roles = require('../../../src/core/constants/roles');
const errorHandler = require('../../../src/core/middleware/errorHandler');
const Notification = require('../../../src/modules/notifications/notification.model');
const { createNotificationService } = require('../../../src/modules/notifications/notification.service');
const createNotificationRouter = require('../../../src/modules/notifications/notification.routes');
const { createReportService } = require('../../../src/modules/reports/report.service');
const createReportRouter = require('../../../src/modules/reports/report.routes');

const userId = 'a'.repeat(24);
const otherUserId = 'b'.repeat(24);
const employeeId = 'c'.repeat(24);
const otherEmployeeId = 'd'.repeat(24);
const departmentId = 'e'.repeat(24);
const now = new Date('2026-09-07T10:00:00.000Z');
const rejects = (work, code) => assert.rejects(work, error => error.code === code);

function notificationFixture({ working = true, attendanceRows = [], approvedLeave = [], paidPayslips = [] } = {}) {
  const store = createStore();
  const Model = store.model(['user', 'dedupeKey']);
  const service = createNotificationService({
    Model,
    employees: { getOwnEmployee: async () => ({ _id: employeeId, employmentStatus: 'ACTIVE', workingSchedule: 'f'.repeat(24) }) },
    schedules: { getSchedule: async () => ({ workingDays: [{ day: 'MONDAY', isWorkingDay: working, startTime: '09:00' }] }) },
    attendance: { findForReporting: async () => attendanceRows },
    timeOff: { findRequestsForReporting: async options => options.statuses?.length === 1 && options.statuses[0] === 'APPROVED' ? approvedLeave : [] },
    contracts: { findAttentionForReporting: async () => [] },
    payruns: { findForReporting: async () => [] },
    payslips: { findForReporting: async () => paidPayslips },
    now: () => now,
  });
  return { Model, service };
}

test('payroll dashboard aggregates live stored values and propagates employee filters', async () => {
  const scopes = [];
  const payrunRows = [{ _id: '1'.repeat(24), status: 'PAID', warnings: [{ code: 'PAY-012', severity: 'WARNING', message: 'Bank' }] }, { _id: '2'.repeat(24), status: 'DRAFT', warnings: [] }];
  const payslipRows = [
    { employee: employeeId, status: 'PAID', netSalary: 50000, periodEnd: new Date('2026-08-31'), employeeSnapshot: { departmentId } },
    { employee: otherEmployeeId, status: 'PAID', netSalary: 40000, periodEnd: new Date('2026-09-30'), contractSnapshot: { departmentId } },
    { employee: employeeId, status: 'COMPUTED', netSalary: 10000, periodEnd: new Date('2026-09-30'), employeeSnapshot: { departmentId } },
  ];
  const service = createReportService({
    employees: { findForReporting: async filters => { assert.equal(filters.departmentId, departmentId); return [{ _id: employeeId }, { _id: otherEmployeeId }]; } },
    departments: { findByIds: async () => [{ _id: departmentId, name: 'Engineering' }] },
    payruns: { findForReporting: async scope => { scopes.push(scope); return payrunRows; } },
    payslips: { findForReporting: async scope => { scopes.push(scope); return payslipRows; } },
    attendance: { findForReporting: async scope => { scopes.push(scope); return [{ _id: '3'.repeat(24), employee: employeeId, status: 'PRESENT' }, { _id: '4'.repeat(24), employee: employeeId, status: 'LATE', manualEdit: true }, { _id: '5'.repeat(24), employee: otherEmployeeId, status: 'ABSENT' }]; } },
    timeOff: { findRequestsForReporting: async scope => { scopes.push(scope); return [{ status: 'APPROVED', duration: 2 }, { status: 'PENDING', duration: 1 }, { status: 'REFUSED', duration: 1 }]; } },
    contracts: { findAttentionForReporting: async () => [{ _id: '6'.repeat(24), employee: employeeId, status: 'DRAFT' }] },
  });
  const result = await service.payrollDashboard({ departmentId, employeeType: 'FULL_TIME', from: new Date('2026-08-01'), to: new Date('2026-09-30T23:59:59.999Z') });
  assert.deepEqual(result.kpis, { totalNetSalaryPaid: 90000, payslipsGenerated: 3, averageSalary: 45000, averageNetSalary: 45000, approvedTimeOff: 1, attendanceHealth: 66.67 });
  assert.deepEqual(result.payrollStatus, { DRAFT: 1, COMPUTED: 0, VALIDATED: 0, PAID: 1 });
  assert.deepEqual(result.salaryByDepartment, [{ departmentId, departmentName: 'Engineering', headcount: 2, totalNetSalary: 90000 }]);
  assert.deepEqual(result.monthlyNetSalaryTrend, [{ month: '2026-08', totalNetSalary: 50000 }, { month: '2026-09', totalNetSalary: 40000 }]);
  assert.deepEqual(result.attendanceOverview, { present: 1, late: 1, absent: 1, overtime: 0, missingCheckout: 0, manualCorrections: 1 });
  assert.deepEqual(result.timeOffOverview, { approved: 1, pending: 1, refused: 1, approvedDays: 2 });
  assert.ok(scopes.every(scope => scope.employeeIds.map(String).join(',') === `${employeeId},${otherEmployeeId}`));
  payslipRows.push({ employee: employeeId, status: 'PAID', netSalary: 10000, periodEnd: new Date('2026-09-30'), employeeSnapshot: { departmentId } });
  assert.equal((await service.payrollDashboard({ departmentId })).kpis.totalNetSalaryPaid, 100000);
});

test('payroll dashboard route allows payroll roles and rejects HR Manager', async t => {
  const auth = (req, res, next) => { req.user = { id: userId, role: req.headers['x-role'], status: 'ACTIVE' }; next(); };
  const app = express();
  app.use('/api/v1/dashboard', createReportRouter({ authenticate: auth, service: { payrollDashboard: async () => ({ kpis: {} }) } }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const request = role => fetch(`http://127.0.0.1:${server.address().port}/api/v1/dashboard/payroll`, { headers: { 'x-role': role } });
  for (const role of [roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN]) assert.equal((await request(role)).status, 200);
  assert.equal((await request(roles.HR_MANAGER)).status, 403);
  assert.equal((await request(roles.EMPLOYEE)).status, 403);
});

test('scheduled active Employee receives one deduplicated missed-check-in reminder', async () => {
  const { Model, service } = notificationFixture();
  const actor = { id: userId, role: roles.EMPLOYEE };
  await service.listNotifications(actor, { page: 1, limit: 20 });
  await service.listNotifications(actor, { page: 1, limit: 20 });
  assert.equal(await Model.countDocuments({ user: userId, type: 'ATTENDANCE_MISSED_CHECKIN' }), 1);
});

test('approved leave, non-working day, and an existing check-in each suppress missed-check-in reminders', async () => {
  const cases = [
    { approvedLeave: [{ startDate: new Date('2026-09-07T00:00:00Z'), endDate: new Date('2026-09-07T23:59:59Z') }] },
    { working: false },
    { attendanceRows: [{ _id: '1'.repeat(24), checkIn: new Date('2026-09-07T09:05:00Z') }] },
  ];
  for (const options of cases) {
    const { Model, service } = notificationFixture(options);
    await service.listNotifications({ id: userId, role: roles.EMPLOYEE }, { page: 1, limit: 20 });
    assert.equal(await Model.countDocuments({ type: 'ATTENDANCE_MISSED_CHECKIN' }), 0);
  }
});

test('a Paid Payslip creates one employee availability notification', async () => {
  const payslipId = '1'.repeat(24);
  const { Model, service } = notificationFixture({ paidPayslips: [{ _id: payslipId, employee: employeeId, status: 'PAID', periodStart: new Date('2026-09-01'), periodEnd: new Date('2026-09-30') }] });
  await service.refresh({ id: userId, role: roles.EMPLOYEE });
  await service.refresh({ id: userId, role: roles.EMPLOYEE });
  const records = await Model.find({ user: userId, type: 'PAYSLIP_AVAILABLE' });
  assert.equal(records.length, 1);
  assert.equal(String(records[0].entityId), payslipId);
});

test('notification reads and read mutations are strictly owner scoped', async () => {
  const { Model, service } = notificationFixture({ working: false });
  const own = await Model.create({ user: userId, type: 'TEST', title: 'Own', message: 'Own', severity: 'INFO', dedupeKey: 'OWN', readAt: null });
  const other = await Model.create({ user: otherUserId, type: 'TEST', title: 'Other', message: 'Other', severity: 'INFO', dedupeKey: 'OTHER', readAt: null });
  const result = await service.listNotifications({ id: userId, role: roles.EMPLOYEE }, { page: 1, limit: 20 });
  assert.deepEqual(result.data.map(record => String(record._id)), [String(own._id)]);
  await service.markRead(own._id, { id: userId });
  assert.ok((await Model.findById(own._id)).readAt);
  await rejects(() => service.markRead(other._id, { id: userId }), 'RESOURCE_NOT_FOUND');
  assert.equal((await Model.findById(other._id)).readAt, null);
});

test('blocking Payrun issues create deduplicated notifications only for payroll roles', async () => {
  const create = () => {
    const store = createStore();
    const Model = store.model(['user', 'dedupeKey']);
    const service = createNotificationService({
      Model,
      timeOff: { findRequestsForReporting: async () => [] },
      attendance: { findForReporting: async () => [] },
      contracts: { findAttentionForReporting: async () => [] },
      payruns: { findForReporting: async () => [{ _id: '1'.repeat(24), warnings: [{ employee: employeeId, code: 'PAY-004', severity: 'BLOCKING', message: 'No contract.' }] }] },
      now: () => now,
    });
    return { Model, service };
  };
  const payroll = create();
  await payroll.service.refresh({ id: userId, role: roles.HR_PAYROLL_USER });
  await payroll.service.refresh({ id: userId, role: roles.HR_PAYROLL_USER });
  assert.equal(await payroll.Model.countDocuments({ type: 'PAYROLL_BLOCKING' }), 1);
  const hr = create();
  await hr.service.refresh({ id: userId, role: roles.HR_MANAGER });
  assert.equal(await hr.Model.countDocuments({ type: 'PAYROLL_BLOCKING' }), 0);
});

test('notification endpoints are authenticated and expose owner refresh/read actions', async t => {
  const calls = [];
  const auth = (req, res, next) => { req.user = { id: userId, role: roles.EMPLOYEE }; next(); };
  const service = { listNotifications: async () => { calls.push('list'); return { data: [], meta: {} }; }, markRead: async () => { calls.push('read'); return {}; }, markAllRead: async () => { calls.push('all'); return { updated: 0 }; } };
  const app = express(); app.use('/api/v1/notifications', createNotificationRouter({ authenticate: auth, service })); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/notifications`;
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(`${base}/${employeeId}/read`, { method: 'PATCH' })).status, 200);
  assert.equal((await fetch(`${base}/read-all`, { method: 'PATCH' })).status, 200);
  assert.deepEqual(calls, ['list', 'read', 'all']);
  assert.ok(Notification.schema.indexes().some(([keys, options]) => keys.user === 1 && keys.dedupeKey === 1 && options.unique));
});
