'use strict';

const AppError = require('../errors/AppError');
const { id } = require('../http/validation');
const roles = require('../constants/roles');
const managers = [roles.HR_MANAGER, roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN];

function requireActor(actor, allowed = Object.values(roles), code = 'AUTH-003') {
  if (!actor) throw new AppError('AUTH-002', 'Authentication required.', 401);
  if (actor.status !== 'ACTIVE') throw new AppError('AUTH-004', 'Account is inactive.', 403);
  if (!allowed.includes(actor.role)) throw new AppError(code, 'You do not have permission for this action.', 403);
}
function actorId(actor) { return id(String(actor.id || actor._id || '')); }
function dependency(method) { throw new AppError('DEPENDENCY_UNAVAILABLE', `Group 1 must connect ${method}.`, 503); }

// Adapters call Group 1 exported services, not its models. No client employee ID
// is used when resolving self-service identity.
function createEmployeeAccess(employees = {}) {
  async function call(method, ...args) {
    if (typeof employees[method] !== 'function') dependency(method);
    return employees[method](...args);
  }
  function valid(record) {
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Employee not found.', 404);
    const employeeId = id(String(record.id || record._id || ''));
    return { ...record, id: employeeId };
  }
  async function get(employeeId, options = {}) {
    id(employeeId);
    return valid(await call('getEmployee', employeeId, options));
  }
  async function own(actor) {
    requireActor(actor, [roles.EMPLOYEE]);
    return valid(await call('getEmployeeForUser', actorId(actor)));
  }
  function active(employee) {
    if (employee.status !== 'ACTIVE') throw new AppError('RESOURCE_CONFLICT', 'Employee is inactive.', 409);
    return employee;
  }
  async function ownership(record, actor) {
    requireActor(actor);
    if (actor.role === roles.EMPLOYEE && String(record.employee) !== (await own(actor)).id) {
      throw new AppError('AUTH-003', 'This record belongs to another employee.', 403);
    }
    return record;
  }
  async function departmentIds(departmentId) {
    id(departmentId);
    const ids = await call('getEmployeeIdsByDepartment', departmentId);
    if (!Array.isArray(ids)) dependency('getEmployeeIdsByDepartment');
    return ids.map(value => id(String(value)));
  }
  // Must write the Employee document (e.g. increment __v) using the provided
  // MongoDB session. This serializes overlap checks across ALL leave types.
  async function lock(employeeId, session) {
    return active(valid(await call('lockEmployeeForLeave', employeeId, { session })));
  }
  return { get, own, active, ownership, departmentIds, lock };
}
module.exports = { createEmployeeAccess, requireActor, actorId, managers, dependency };
