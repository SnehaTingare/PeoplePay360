'use strict';
const Attendance = require('./attendance.model');
const validation = require('./attendance.validation');
const AppError = require('../../core/errors/AppError');
const persistenceError = require('../../core/errors/persistenceError');
const paginate = require('../../core/http/pagination');
const dates = require('../../core/http/dates');
const { createEmployeeAccess, requireActor, actorId, managers } = require('../../core/security/employeeAccess');
const createScheduleAccess = require('../../core/utils/scheduledTime');

function calculateWorkedMinutes(checkIn, checkOut) {
  if (!checkIn) throw new AppError('ATT-001', 'Check-in is required.', 422);
  if (!checkOut || !Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) || checkOut <= checkIn) {
    throw new AppError('ATT-002', 'Check-out must be later than check-in.', 422);
  }
  return (checkOut - checkIn) / 60000;
}
function determineStatus(checkIn, checkOut, schedule) {
  if (!checkOut) return 'MISSING_CHECKOUT';
  const minutes = calculateWorkedMinutes(checkIn, checkOut);
  if (checkIn > schedule.start) return 'LATE';
  if (minutes > schedule.expectedMinutes) return 'OVERTIME';
  return 'PRESENT';
}

function createAttendanceService({ Model = Attendance, employees, schedules, now = () => new Date() } = {}) {
  const access = createEmployeeAccess(employees);
  const scheduleAccess = createScheduleAccess(schedules);
  async function derive(employeeId, checkIn, checkOut) {
    const schedule = await scheduleAccess.attendance(employeeId, checkIn);
    const workedMinutes = checkOut ? calculateWorkedMinutes(checkIn, checkOut) : 0;
    return { date: schedule.date, workedMinutes, workedHours: workedMinutes / 60, status: determineStatus(checkIn, checkOut, schedule) };
  }
  async function checkIn(actor, body = {}) {
    validation.empty(body);
    const employee = access.active(await access.own(actor));
    const timestamp = now();
    const schedule = await scheduleAccess.attendance(employee.id, timestamp);
    if (await Model.exists({ employee: employee.id, status: 'OPEN' })) throw new AppError('ATT-003', 'An open check-in already exists.', 409);
    try { return await Model.create({ employee: employee.id, date: schedule.date, checkIn: timestamp, status: 'OPEN', workedMinutes: 0, workedHours: 0 }); }
    catch (error) { throw persistenceError(error, 'ATT-003'); }
  }
  async function checkOut(actor, body = {}) {
    validation.empty(body);
    const employee = access.active(await access.own(actor));
    const record = await Model.findOne({ employee: employee.id, status: 'OPEN' });
    if (!record) throw new AppError('ATT-001', 'No open check-in exists.', 422);
    const checkOut = now();
    const derived = await derive(employee.id, record.checkIn, checkOut);
    const saved = await Model.findOneAndUpdate({ _id: record._id, status: 'OPEN', __v: record.__v },
      { $set: { ...derived, checkOut }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!saved) throw new AppError('RESOURCE_CONFLICT', 'Attendance changed; reload and retry.', 409);
    return saved;
  }
  async function getAttendance(id, actor) {
    validation.id(id);
    requireActor(actor);
    const record = await Model.findById(id);
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Attendance not found.', 404);
    return access.ownership(record, actor);
  }
  async function listAttendance(query, actor, own = false) {
    requireActor(actor, own ? ['EMPLOYEE'] : managers);
    const options = validation.listQuery(query, own);
    const filter = {};
    if (own) filter.employee = (await access.own(actor)).id;
    else if (options.employeeId) { await access.get(options.employeeId); filter.employee = options.employeeId; }
    if (options.departmentId) {
      const ids = await access.departmentIds(options.departmentId);
      filter.employee = { $in: options.employeeId ? ids.filter(id => id === options.employeeId) : ids };
    }
    if (options.status) filter.status = options.status;
    dates.filter(options, 'date', filter);
    return paginate(Model, filter, options, { date: -1, checkIn: -1, _id: -1 });
  }
  async function createManualAttendance(body, actor) {
    requireActor(actor, managers, 'ATT-005');
    const input = validation.manualInput(body);
    access.active(await access.get(input.employeeId));
    const derived = await derive(input.employeeId, input.checkIn, input.checkOut);
    try {
      return await Model.create({ ...derived, employee: input.employeeId, checkIn: input.checkIn,
        checkOut: input.checkOut, notes: input.notes, manualEdit: true, editedBy: actorId(actor) });
    } catch (error) { throw persistenceError(error, 'ATT-003'); }
  }
  async function correctAttendance(id, body, actor) {
    requireActor(actor, managers, 'ATT-005');
    const input = validation.manualInput(body, true);
    const record = await getAttendance(id, actor);
    const checkIn = input.checkIn || record.checkIn;
    const checkOut = input.checkOut || record.checkOut;
    const derived = await derive(String(record.employee), checkIn, checkOut);
    record.set({ ...input, ...derived, manualEdit: true, editedBy: actorId(actor) });
    try { return await record.save(); }
    catch (error) { throw persistenceError(error, 'ATT-003'); }
  }
  // Internal job contract: caller supplies the cutoff according to the shift
  // calendar. No arbitrary expiry duration or additional public endpoint.
  async function markMissingCheckouts(before) {
    if (!(before instanceof Date) || !Number.isFinite(before.getTime()) || before > now()) throw new AppError('VALIDATION_ERROR', 'Invalid missing-checkout cutoff.', 400);
    return Model.updateMany({ status: 'OPEN', checkOut: null, checkIn: { $lt: before } },
      { $set: { status: 'MISSING_CHECKOUT' }, $inc: { __v: 1 } });
  }
  return { checkIn, checkOut, getAttendance, listAttendance, createManualAttendance, correctAttendance, markMissingCheckouts };
}
module.exports = { createAttendanceService, ...createAttendanceService(), calculateWorkedMinutes, determineStatus };
