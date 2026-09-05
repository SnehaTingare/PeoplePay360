'use strict';

const mongoose = require('mongoose');
const Employee = require('./employee.model');
const departmentService = require('../departments/department.service');
const scheduleService = require('../schedules/schedule.service');
const userService = require('../users/user.service');
const AppError = require('../../core/errors/AppError');
const paginate = require('../../core/http/pagination');

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const duplicateField = (error, field) => error?.code === 11000 && Boolean(error.keyPattern?.[field]);

function createEmployeeService({ Model = Employee, departments = departmentService, schedules = scheduleService, users = userService } = {}) {
  async function getEmployee(id) {
    if (!mongoose.isObjectIdOrHexString(id)) throw new AppError('RESOURCE_NOT_FOUND', 'Employee not found.', 404);
    const employee = await Model.findById(id);
    if (!employee) throw new AppError('RESOURCE_NOT_FOUND', 'Employee not found.', 404);
    return employee;
  }
  async function validateRelationships(input, employeeId = null) {
    if (input.departmentId !== undefined) await departments.getDepartment(input.departmentId);
    if (input.workingScheduleId !== undefined) await schedules.getSchedule(input.workingScheduleId);
    if (input.managerId) {
      if (employeeId && String(input.managerId) === String(employeeId)) throw new AppError('EMP-002', 'Employee cannot be their own manager.', 422);
      await getEmployee(input.managerId);
    }
    if (input.userId) {
      const user = await users.findById(input.userId);
      if (!user) throw new AppError('RESOURCE_NOT_FOUND', 'User not found.', 404);
      const linked = await Model.exists({ user: input.userId, ...(employeeId ? { _id: { $ne: employeeId } } : {}) });
      if (linked) throw new AppError('RESOURCE_CONFLICT', 'User is already linked to another Employee.', 409);
    }
  }
  async function listEmployees({ q, departmentId, employeeType, employmentStatus, managerId, page, limit }) {
    const filter = {};
    if (q) {
      const search = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ firstName: search }, { lastName: search }, { email: search }, { employeeId: search }];
    }
    if (departmentId) filter.department = departmentId;
    if (employeeType) filter.employeeType = employeeType;
    if (employmentStatus) filter.employmentStatus = employmentStatus;
    if (managerId) filter.manager = managerId;
    return paginate(Model, filter, { page, limit }, { firstName: 1, lastName: 1, _id: 1 });
  }
  async function createEmployee(input) {
    const objectId = new mongoose.Types.ObjectId();
    const _id = objectId.toHexString();
    await validateRelationships(input, _id);
    if (await Model.exists({ email: input.email.toLowerCase() })) {
      throw new AppError('EMP-001', 'Employee email already exists.', 409);
    }
    try {
      return await Model.create({
        _id,
        employeeId: `PP360-E-${objectId.toHexString().slice(-8).toUpperCase()}`,
        user: input.userId ?? null,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        department: input.departmentId,
        jobPosition: input.jobPosition,
        manager: input.managerId ?? null,
        employeeType: input.employeeType,
        workingSchedule: input.workingScheduleId,
        joiningDate: input.joiningDate,
        bankDetails: input.bankDetails ?? null,
        employmentStatus: 'ACTIVE',
      });
    } catch (error) {
      if (duplicateField(error, 'email')) throw new AppError('EMP-001', 'Employee email already exists.', 409);
      if (duplicateField(error, 'user')) throw new AppError('RESOURCE_CONFLICT', 'User is already linked to another Employee.', 409);
      throw error;
    }
  }
  async function updateEmployee(id, input) {
    const employee = await getEmployee(id);
    await validateRelationships(input, employee._id);
    if (input.email && await Model.exists({ email: input.email.toLowerCase(), _id: { $ne: employee._id } })) {
      throw new AppError('EMP-001', 'Employee email already exists.', 409);
    }
    const changes = { ...input };
    const mapping = { userId: 'user', departmentId: 'department', managerId: 'manager', workingScheduleId: 'workingSchedule' };
    for (const [source, target] of Object.entries(mapping)) {
      if (Object.hasOwn(changes, source)) {
        changes[target] = changes[source];
        delete changes[source];
      }
    }
    employee.set(changes);
    try { return await employee.save(); }
    catch (error) {
      if (duplicateField(error, 'email')) throw new AppError('EMP-001', 'Employee email already exists.', 409);
      if (duplicateField(error, 'user')) throw new AppError('RESOURCE_CONFLICT', 'User is already linked to another Employee.', 409);
      throw error;
    }
  }
  async function setEmploymentStatus(id, employmentStatus) {
    const employee = await getEmployee(id);
    employee.employmentStatus = employmentStatus;
    await employee.save();
    return employee;
  }
  async function getOwnEmployee(actor) {
    if (!actor?.employeeId) throw new AppError('RESOURCE_NOT_FOUND', 'No Employee is linked to this User.', 404);
    return getEmployee(String(actor.employeeId));
  }
  async function assertOwnership(employeeId, actor) {
    if (!actor?.employeeId || String(actor.employeeId) !== String(employeeId)) {
      throw new AppError('EMP-005', 'Employee cannot access another Employee record.', 403);
    }
    return getEmployee(employeeId);
  }
  return {
    listEmployees, createEmployee, getEmployee, updateEmployee, getOwnEmployee, assertOwnership,
    activateEmployee: id => setEmploymentStatus(id, 'ACTIVE'),
    deactivateEmployee: id => setEmploymentStatus(id, 'INACTIVE'),
  };
}

module.exports = { createEmployeeService, ...createEmployeeService() };
