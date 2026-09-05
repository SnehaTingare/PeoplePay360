'use strict';

const Notification = require('./notification.model');
const roles = require('../../core/constants/roles');
const AppError = require('../../core/errors/AppError');
const paginate = require('../../core/http/pagination');
const employeeService = require('../employees/employee.service');
const scheduleService = require('../schedules/schedule.service');
const attendanceService = require('../attendance/attendance.service');
const timeOffService = require('../timeOff/timeOff.service');
const contractService = require('../contracts/contract.service');
const payrunService = require('../payruns/payrun.service');
const payslipService = require('../payslips/payslip.service');

const DAY = 86400000;
const managerRoles = new Set([roles.HR_MANAGER, roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN]);
const payrollRoles = new Set([roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN]);
const actorId = actor => actor?.id || actor?._id;
const dateKey = date => date.toISOString().slice(0, 10);

function createNotificationService({
  Model = Notification,
  employees = employeeService,
  schedules = scheduleService,
  attendance = attendanceService,
  timeOff = timeOffService,
  contracts = contractService,
  payruns = payrunService,
  payslips = payslipService,
  now = () => new Date(),
  graceMinutes = 30,
} = {}) {
  async function ensure(userId, data) {
    const filter = { user: userId, dedupeKey: data.dedupeKey };
    const existing = await Model.findOne(filter);
    if (existing) return existing;
    try { return await Model.create({ user: userId, ...data }); }
    catch (error) {
      if (error.code === 11000) return Model.findOne(filter);
      throw error;
    }
  }
  async function refreshEmployee(actor, timestamp) {
    const employee = await employees.getOwnEmployee(actor);
    const employeeId = String(employee._id);
    const start = new Date(`${dateKey(timestamp)}T00:00:00.000Z`);
    const end = new Date(start.getTime() + DAY - 1);
    if (employee.employmentStatus === 'ACTIVE') {
      const schedule = await schedules.getSchedule(employee.workingSchedule);
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const line = (schedule.workingDays || []).find(item => item.day === days[timestamp.getUTCDay()]);
      if (line?.isWorkingDay && line.startTime) {
        const scheduledStart = new Date(`${dateKey(timestamp)}T${line.startTime}:00.000Z`);
        if (timestamp >= new Date(scheduledStart.getTime() + graceMinutes * 60000)) {
          const [attendanceRows, approvedLeave] = await Promise.all([
            attendance.findForReporting({ employeeIds: [employee._id], from: start, to: end }),
            timeOff.findRequestsForReporting({ employeeIds: [employee._id], from: start, to: end, statuses: ['APPROVED'] }),
          ]);
          const leaveCoversStart = approvedLeave.some(request => new Date(request.startDate) <= scheduledStart && new Date(request.endDate) >= scheduledStart);
          if (!attendanceRows.length && !leaveCoversStart) await ensure(actorId(actor), {
            type: 'ATTENDANCE_MISSED_CHECKIN', title: 'Attendance reminder', message: 'You are scheduled today but have not checked in.', severity: 'ACTION_REQUIRED', entityType: 'Employee', entityId: employee._id, dedupeKey: `MISSED_CHECKIN:${employeeId}:${dateKey(timestamp)}`,
          });
        }
      }
    }
    const recentLeave = await timeOff.findRequestsForReporting({ employeeIds: [employee._id], statuses: ['APPROVED', 'REFUSED'], decidedAfter: new Date(timestamp.getTime() - 30 * DAY) });
    for (const request of recentLeave) await ensure(actorId(actor), {
      type: 'LEAVE_STATUS', title: 'Time off request updated', message: `Your time off request was ${request.status.toLowerCase()}.`, severity: 'INFO', entityType: 'TimeOffRequest', entityId: request._id, dedupeKey: `LEAVE_STATUS:${request._id}:${request.status}`,
    });
    const paidPayslips = await payslips.findForReporting({ employeeIds: [employee._id], statuses: ['PAID'] });
    for (const payslip of paidPayslips) await ensure(actorId(actor), {
      type: 'PAYSLIP_AVAILABLE', title: 'Payslip available', message: `Your payslip for ${dateKey(new Date(payslip.periodStart))} to ${dateKey(new Date(payslip.periodEnd))} is available.`, severity: 'INFO', entityType: 'Payslip', entityId: payslip._id, dedupeKey: `PAYSLIP_AVAILABLE:${payslip._id}`,
    });
  }
  async function refreshManager(actor, timestamp) {
    const [pending, exceptions, contractAttention] = await Promise.all([
      timeOff.findRequestsForReporting({ statuses: ['PENDING'] }),
      attendance.findForReporting({ statuses: ['MISSING_CHECKOUT'] }),
      contracts.findAttentionForReporting({ through: new Date(timestamp.getTime() + 30 * DAY) }),
    ]);
    for (const request of pending) await ensure(actorId(actor), { type: 'LEAVE_PENDING', title: 'Pending time off request', message: 'A time off request requires review.', severity: 'ACTION_REQUIRED', entityType: 'TimeOffRequest', entityId: request._id, dedupeKey: `LEAVE_PENDING:${request._id}` });
    for (const record of exceptions) await ensure(actorId(actor), { type: 'ATTENDANCE_EXCEPTION', title: 'Attendance exception', message: 'A missing checkout requires attention.', severity: 'WARNING', entityType: 'Attendance', entityId: record._id, dedupeKey: `ATTENDANCE_EXCEPTION:${record._id}` });
    for (const contract of contractAttention) await ensure(actorId(actor), { type: 'CONTRACT_ATTENTION', title: 'Contract requires attention', message: contract.status === 'DRAFT' ? 'A Draft Contract requires review.' : 'A Contract is approaching its end date.', severity: 'WARNING', entityType: 'Contract', entityId: contract._id, dedupeKey: `CONTRACT_ATTENTION:${contract._id}:${contract.status}` });
    if (payrollRoles.has(actor.role)) {
      const payroll = await payruns.findForReporting({});
      for (const payrun of payroll) for (const issue of (payrun.warnings || []).filter(item => item.severity === 'BLOCKING')) await ensure(actorId(actor), {
        type: 'PAYROLL_BLOCKING', title: 'Payroll requires attention', message: issue.message, severity: 'ACTION_REQUIRED', entityType: 'Payrun', entityId: payrun._id, dedupeKey: `PAYROLL_BLOCKING:${payrun._id}:${issue.code}:${issue.employee || 'GLOBAL'}`,
      });
    }
  }
  async function refresh(actor) {
    const userId = actorId(actor);
    if (!userId) throw new AppError('AUTH-002', 'Authentication token is missing or invalid.', 401);
    const timestamp = now();
    if (actor.role === roles.EMPLOYEE) await refreshEmployee(actor, timestamp);
    else if (managerRoles.has(actor.role)) await refreshManager(actor, timestamp);
  }
  async function listNotifications(actor, options) {
    await refresh(actor);
    const filter = { user: actorId(actor) };
    if (options.unread === true) filter.readAt = null;
    if (options.unread === false) filter.readAt = { $ne: null };
    return paginate(Model, filter, options, { createdAt: -1, _id: -1 });
  }
  async function markRead(id, actor) {
    const record = await Model.findOne({ _id: id, user: actorId(actor) });
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Notification not found.', 404);
    if (!record.readAt) { record.readAt = now(); await record.save(); }
    return record;
  }
  async function markAllRead(actor) {
    const result = await Model.updateMany({ user: actorId(actor), readAt: null }, { $set: { readAt: now() } });
    return { updated: result.modifiedCount || 0 };
  }
  return { refresh, listNotifications, markRead, markAllRead };
}

module.exports = { createNotificationService, ...createNotificationService() };
