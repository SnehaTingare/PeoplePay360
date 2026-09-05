'use strict';

const TimeOffType = require('./timeOffType.model');
const validation = require('./timeOff.validation');
const AppError = require('../../core/errors/AppError');
const persistenceError = require('../../core/errors/persistenceError');
const paginate = require('../../core/http/pagination');
const { search } = require('../../core/http/validation');

// hasTypeHistory(id) must check approved leave/history before policy changes.
function createTimeOffService({ Type = TimeOffType, hasTypeHistory } = {}) {
  async function getType(id, { activeOnly = false } = {}) {
    validation.id(id);
    const record = await Type.findOne({ _id: id, ...(activeOnly ? { active: true } : {}) });
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Time Off Type not found.', 404);
    return record;
  }

  async function listTypes(query, { activeOnly = false } = {}) {
    const options = validation.listQuery(query);
    const filter = {};
    for (const key of ['active', 'unit', 'requiresAllocation']) if (options[key] !== undefined) filter[key] = options[key];
    if (activeOnly) filter.active = true;
    if (options.q) filter.$or = [{ name: search(options.q) }, { code: search(options.q) }];
    return paginate(Type, filter, options, { name: 1, _id: 1 });
  }

  function validatePolicy(policy) {
    if ((policy.payrollTreatment === 'PAID' && !policy.isPaid) ||
        (policy.payrollTreatment === 'UNPAID_DEDUCTION' && policy.isPaid)) {
      throw new AppError('VALIDATION_ERROR', 'Paid status and payroll treatment are inconsistent.', 422);
    }
  }

  async function createType(body) {
    const input = validation.typeInput(body);
    validatePolicy(input);
    try { return await Type.create(input); }
    catch (error) { throw persistenceError(error); }
  }

  async function updateType(id, body) {
    const input = validation.typeInput(body, true);
    const record = await getType(id);
    validatePolicy({ ...record.toObject(), ...input });
    const policyFields = ['unit', 'requiresAllocation', 'requiresApproval', 'isPaid', 'payrollTreatment'];
    if (policyFields.some(key => key in input && input[key] !== record[key])) {
      if (typeof hasTypeHistory !== 'function') {
        throw new AppError('DEPENDENCY_UNAVAILABLE', 'Leave history checks must be connected before changing type policy.', 503);
      }
      const hasHistory = await hasTypeHistory(id);
      if (typeof hasHistory !== 'boolean') throw new AppError('DEPENDENCY_UNAVAILABLE', 'Leave history check did not return a result.', 503);
      if (hasHistory) throw new AppError('RESOURCE_CONFLICT', 'This type has historical leave records; create a new type for the changed policy.', 409);
    }
    record.set(input);
    try { return await record.save(); }
    catch (error) { throw persistenceError(error); }
  }

  async function deactivateType(id) {
    const record = await getType(id);
    record.active = false;
    try { return await record.save(); }
    catch (error) { throw persistenceError(error); }
  }

  // Future request creation must use this exported lookup, never an unrestricted ID lookup.
  const getActiveType = id => getType(id, { activeOnly: true });
  return { listTypes, createType, getType, updateType, deactivateType, getActiveType };
}

module.exports = { createTimeOffService, ...createTimeOffService() };
