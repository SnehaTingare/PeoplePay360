'use strict';
const AppError = require('../errors/AppError');
const { dateOnly } = require('../http/dates');
const { dependency } = require('../security/employeeAccess');

// Group 1 resolves contract/employee schedule precedence and timezone. Attendance
// receives absolute shift boundaries; leave receives working intervals EXCLUDING
// breaks. Split intervals preserve exact overlap for partial-hour requests.
function createScheduleAccess(schedules = {}) {
  async function attendance(employeeId, checkIn) {
    if (typeof schedules.getAttendanceContext !== 'function') dependency('getAttendanceContext');
    const value = await schedules.getAttendanceContext(employeeId, checkIn);
    if (!value) dependency('getAttendanceContext');
    const start = new Date(value.start);
    const end = new Date(value.end);
    const breakMinutes = value.breakMinutes;
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start ||
        typeof breakMinutes !== 'number' || !Number.isFinite(breakMinutes) || breakMinutes < 0 || breakMinutes > (end - start) / 60000) {
      throw new AppError('DEPENDENCY_UNAVAILABLE', 'Invalid schedule context.', 503);
    }
    return {
      date: dateOnly(value.date),
      start,
      end,
      expectedMinutes: (end - start) / 60000 - breakMinutes,
    };
  }
  async function duration(employeeId, startDate, endDate, unit, options = {}) {
    if (typeof schedules.getWorkingIntervals !== 'function') dependency('getWorkingIntervals');
    const intervals = await schedules.getWorkingIntervals(employeeId, { startDate, endDate, ...options });
    if (!Array.isArray(intervals)) dependency('getWorkingIntervals');
    const calendar = startDate.toISOString().slice(11) === '00:00:00.000Z' && endDate.toISOString().slice(11) === '23:59:59.999Z';
    const days = new Set();
    let minutes = 0;
    let previousEnd = -Infinity;
    const ordered = intervals.map(interval => ({ date: interval.date, start: new Date(interval.start), end: new Date(interval.end) }))
      .sort((a, b) => a.start - b.start);
    for (const interval of ordered) {
      dateOnly(interval.date);
      if (!Number.isFinite(interval.start.getTime()) || !Number.isFinite(interval.end.getTime()) || interval.end <= interval.start || interval.start < previousEnd) {
        throw new AppError('DEPENDENCY_UNAVAILABLE', 'Invalid or overlapping working intervals.', 503);
      }
      previousEnd = interval.end.getTime();
      const covered = calendar
        ? (interval.date >= startDate.toISOString().slice(0, 10) && interval.date <= endDate.toISOString().slice(0, 10) ? interval.end - interval.start : 0)
        : Math.max(0, Math.min(endDate.getTime(), interval.end.getTime()) - Math.max(startDate.getTime(), interval.start.getTime()));
      if (covered > 0) { days.add(interval.date); minutes += covered / 60000; }
    }
    const amount = unit === 'DAYS' ? days.size : minutes / 60;
    if (!Number.isFinite(amount) || amount <= 0) throw new AppError('VALIDATION_ERROR', 'Leave must cover scheduled working time.', 422);
    return amount;
  }
  return { attendance, duration };
}
module.exports = createScheduleAccess;
