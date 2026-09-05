'use strict';
const TimeOffType = require('./timeOffType.model');
const TimeOffAllocation = require('./allocation.model');
const TimeOffRequest = require('./timeOffRequest.model');
const v = require('./timeOff.validation');
const dates = require('../../core/http/dates');
const AppError = require('../../core/errors/AppError');
const persistenceError = require('../../core/errors/persistenceError');
const paginate = require('../../core/http/pagination');
const { createEmployeeAccess, requireActor, actorId, managers } = require('../../core/security/employeeAccess');
const createScheduleAccess = require('../../core/utils/scheduledTime');

function createLeaveService({ Type = TimeOffType, Allocation = TimeOffAllocation, Request = TimeOffRequest,
  employees, schedules, now = () => new Date(), transaction = work => Request.db.transaction(work) } = {}) {
  const access = createEmployeeAccess(employees);
  const schedule = createScheduleAccess(schedules);
  const conflict = () => new AppError('RESOURCE_CONFLICT', 'The current state does not allow this action.', 409);
  async function atomic(work) {
    try { return await transaction(work); }
    catch (error) {
      if (error.code === 20 || error.codeName === 'IllegalOperation') {
        throw new AppError('DEPENDENCY_UNAVAILABLE', 'Leave creation/approval requires MongoDB transaction support; no partial operation was committed.', 503);
      }
      throw persistenceError(error);
    }
  }
  async function type(id, session, lock = false) {
    v.id(id);
    const record = lock
      ? await Type.findOneAndUpdate({ _id: id, active: true }, { $inc: { __v: 1 } }, { new: true, session })
      : await Type.findOne({ _id: id, active: true }).session(session || null);
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Active Time Off Type not found.', 404);
    return record;
  }
  async function find(Model, id, session) {
    v.id(id);
    const record = await Model.findById(id).session(session || null);
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Leave record not found.', 404);
    return record;
  }
  async function getAllocation(id, actor) { requireActor(actor); return access.ownership(await find(Allocation, id), actor); }
  async function getRequest(id, actor) { requireActor(actor); return access.ownership(await find(Request, id), actor); }

  async function list(query, actor, allocation, own) {
    requireActor(actor, own ? ['EMPLOYEE'] : managers);
    const options = v.leaveQuery(query, allocation, own);
    const filter = {};
    if (own) filter.employee = (await access.own(actor)).id;
    else if (options.employeeId) { await access.get(options.employeeId); filter.employee = options.employeeId; }
    if (options.timeOffTypeId) filter.timeOffType = options.timeOffTypeId;
    if (options.status) filter.status = options.status;
    if (options.validOn) { filter.validFrom = { $lte: options.validOn }; filter.validUntil = { $gte: options.validOn }; }
    if (!allocation) {
      if (options.from) filter.endDate = { $gte: options.from };
      if (options.to) filter.startDate = { $lt: new Date(options.to.getTime() + dates.DAY) };
    }
    return paginate(allocation ? Allocation : Request, filter, options, allocation ? { validFrom: -1, _id: -1 } : { startDate: -1, _id: -1 });
  }
  async function createAllocation(body, actor) {
    requireActor(actor, managers);
    const input = v.allocationInput(body);
    access.active(await access.get(input.employeeId));
    await type(input.timeOffTypeId);
    return Allocation.create({ employee: input.employeeId, timeOffType: input.timeOffTypeId,
      allocatedAmount: input.allocatedAmount, takenAmount: 0, remainingAmount: input.allocatedAmount,
      validFrom: input.validFrom, validUntil: input.validUntil, status: 'DRAFT' });
  }
  async function updateAllocation(id, body, actor) {
    requireActor(actor, managers);
    const input = v.allocationInput(body, true);
    const record = await find(Allocation, id);
    if (record.status !== 'DRAFT' || record.takenAmount !== 0) throw conflict();
    const employeeId = input.employeeId || String(record.employee);
    const typeId = input.timeOffTypeId || String(record.timeOffType);
    access.active(await access.get(employeeId));
    await type(typeId);
    const values = { allocatedAmount: record.allocatedAmount, validFrom: record.validFrom, validUntil: record.validUntil, ...input };
    dates.range(values.validFrom, values.validUntil, 'LEV-001');
    record.set({ employee: employeeId, timeOffType: typeId, allocatedAmount: values.allocatedAmount,
      remainingAmount: values.allocatedAmount, validFrom: values.validFrom, validUntil: values.validUntil });
    try { return await record.save(); } catch (error) { throw persistenceError(error); }
  }
  async function approveAllocation(id, actor) {
    requireActor(actor, managers);
    const record = await find(Allocation, id);
    if (record.status !== 'DRAFT' || record.takenAmount !== 0) throw conflict();
    access.active(await access.get(String(record.employee)));
    await type(String(record.timeOffType));
    if (record.validUntil < now()) throw new AppError('LEV-005', 'Allocation has expired.', 422);
    const saved = await Allocation.findOneAndUpdate({ _id: id, status: 'DRAFT', takenAmount: 0, __v: record.__v },
      { $set: { status: 'APPROVED', approvedBy: actorId(actor), approvedAt: now() }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!saved) throw conflict();
    return saved;
  }
  async function cancelAllocation(id, actor) {
    requireActor(actor, managers);
    await find(Allocation, id);
    const saved = await Allocation.findOneAndUpdate({ _id: id, status: { $in: ['DRAFT', 'APPROVED'] }, takenAmount: 0 },
      { $set: { status: 'CANCELLED' }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!saved) throw conflict();
    return saved;
  }
  async function deleteAllocation(id, actor) {
    requireActor(actor, managers);
    await find(Allocation, id);
    const result = await Allocation.deleteOne({ _id: id, status: 'DRAFT', takenAmount: 0 });
    if (result.deletedCount !== 1) throw conflict();
    return { id };
  }
  async function matchingAllocation(employeeId, typeId, startDate, endDate, duration, session) {
    const approved = await Allocation.find({ employee: employeeId, timeOffType: typeId, status: 'APPROVED' }).session(session).sort({ validUntil: 1, _id: 1 });
    if (!approved.length) throw new AppError('LEV-002', 'An approved allocation is required.', 422);
    const valid = approved.filter(record => record.validFrom <= startDate && record.validUntil >= endDate && record.validUntil >= now());
    if (!valid.length) throw new AppError('LEV-005', 'No allocation is valid for the requested dates.', 422);
    const allocation = valid.find(record => record.remainingAmount >= duration);
    if (!allocation) throw new AppError('LEV-003', 'Insufficient leave balance.', 422);
    return allocation;
  }
  async function createRequest(body, actor) {
    requireActor(actor);
    const input = v.requestInput(body, actor.role === 'EMPLOYEE');
    const employee = actor.role === 'EMPLOYEE' ? access.active(await access.own(actor)) : access.active(await access.get(input.employeeId));
    return atomic(async session => {
      // A real write on the employee serializes range checks across leave types.
      await access.lock(employee.id, session);
      const leaveType = await type(input.timeOffTypeId, session, true);
      if (await Request.exists({ employee: employee.id, status: { $in: ['PENDING', 'APPROVED'] },
        startDate: { $lt: input.endDate }, endDate: { $gt: input.startDate } }).session(session)) {
        throw new AppError('LEV-004', 'Leave overlaps an existing pending or approved request.', 409);
      }
      const duration = await schedule.duration(employee.id, input.startDate, input.endDate, leaveType.unit, { session });
      const allocation = leaveType.requiresAllocation
        ? await matchingAllocation(employee.id, input.timeOffTypeId, input.startDate, input.endDate, duration, session) : null;
      const [record] = await Request.create([{ employee: employee.id, timeOffType: input.timeOffTypeId,
        allocation: allocation?._id || null, startDate: input.startDate, endDate: input.endDate,
        duration, reason: input.reason, status: 'PENDING' }], { session });
      return record;
    });
  }
  async function approveRequest(id, actor) {
    requireActor(actor, managers, 'LEV-008');
    v.id(id);
    const decisionBy = actorId(actor);
    return atomic(async session => {
      const record = await find(Request, id, session);
      if (record.status !== 'PENDING') throw conflict();
      await access.lock(String(record.employee), session);
      const leaveType = await type(String(record.timeOffType), session, true);
      if (leaveType.requiresAllocation) {
        if (!record.allocation) throw new AppError('LEV-002', 'An approved allocation is required.', 422);
        const allocation = await find(Allocation, String(record.allocation), session);
        if (allocation.status !== 'APPROVED' || String(allocation.employee) !== String(record.employee) || String(allocation.timeOffType) !== String(record.timeOffType)) throw new AppError('LEV-002', 'An approved matching allocation is required.', 422);
        if (allocation.validFrom > record.startDate || allocation.validUntil < record.endDate || allocation.validUntil < now()) throw new AppError('LEV-005', 'Allocation is not valid for this request.', 422);
        // The conditional update protects the balance even when approvals race.
        const consumed = await Allocation.findOneAndUpdate({ _id: allocation._id, status: 'APPROVED',
          remainingAmount: { $gte: record.duration }, __v: allocation.__v },
        { $inc: { takenAmount: record.duration, remainingAmount: -record.duration, __v: 1 } }, { new: true, session, runValidators: true });
        if (!consumed) throw new AppError('LEV-003', 'Insufficient or changed leave balance.', 422);
      }
      const saved = await Request.findOneAndUpdate({ _id: id, status: 'PENDING', __v: record.__v },
        { $set: { status: 'APPROVED', decisionBy, decisionAt: now() }, $inc: { __v: 1 } }, { new: true, session, runValidators: true });
      if (!saved) throw conflict(); // Rolls back any balance update in the transaction.
      return saved;
    });
  }
  async function refuseRequest(id, body, actor) {
    requireActor(actor, managers, 'LEV-008');
    const comment = v.decisionInput(body);
    await find(Request, id);
    const saved = await Request.findOneAndUpdate({ _id: id, status: 'PENDING' },
      { $set: { status: 'REFUSED', decisionBy: actorId(actor), decisionAt: now(), decisionComment: comment }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!saved) throw conflict();
    return saved;
  }
  async function hasTypeHistory(id) {
    // Existing requests/allocations retain their unit and payroll meaning.
    return Boolean(await Request.exists({ timeOffType: id }) || await Allocation.exists({ timeOffType: id }));
  }
  async function findApprovedForPayroll(employeeId, periodStart, periodEnd) {
    return Request.find({ employee: employeeId, status: 'APPROVED', startDate: { $lte: periodEnd }, endDate: { $gte: periodStart } })
      .populate('timeOffType');
  }
  async function findRequestsForReporting({ employeeIds, from, to, statuses, decidedAfter } = {}) {
    const filter = {};
    if (employeeIds) filter.employee = { $in: employeeIds };
    if (statuses) filter.status = { $in: statuses };
    if (from) filter.endDate = { $gte: from };
    if (to) filter.startDate = { $lte: to };
    if (decidedAfter) filter.decisionAt = { $gte: decidedAfter };
    return Request.find(filter);
  }
  return { createAllocation, updateAllocation, getAllocation, approveAllocation, cancelAllocation, deleteAllocation,
    listAllocations: (query, actor, own = false) => list(query, actor, true, own),
    listRequests: (query, actor, own = false) => list(query, actor, false, own),
    createRequest, getRequest, approveRequest, refuseRequest, hasTypeHistory, findApprovedForPayroll, findRequestsForReporting };
}
module.exports = { createLeaveService };
