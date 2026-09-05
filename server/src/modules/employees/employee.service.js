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
const transactionCapable = () => {
  const topology = mongoose.connection.client?.topology?.description?.type;
  return mongoose.connection.readyState === 1 && ['ReplicaSetWithPrimary', 'Sharded'].includes(topology);
};

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
    const normalizedEmail = input.email.toLowerCase();
    await validateRelationships(input, _id);
    if (await Model.exists({ email: normalizedEmail })) {
      throw new AppError('EMP-001', 'Employee email already exists.', 409);
    }
    await users.assertEmployeeAccountEmailAvailable(normalizedEmail);
    const persist = async (session, created = null) => {
      const account = await users.provisionEmployeeAccount({
        firstName: input.firstName, lastName: input.lastName, email: normalizedEmail,
      }, { session });
      const provisionedUser = account.user;
      if (created) created.user = provisionedUser;
      const data = {
        _id,
        employeeId: `PP360-E-${objectId.toHexString().slice(-8).toUpperCase()}`,
        user: provisionedUser._id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizedEmail,
        phone: input.phone,
        department: input.departmentId,
        jobPosition: input.jobPosition,
        manager: input.managerId ?? null,
        employeeType: input.employeeType,
        workingSchedule: input.workingScheduleId,
        joiningDate: input.joiningDate,
        bankDetails: input.bankDetails ?? null,
        employmentStatus: 'ACTIVE',
      };
      const employee = session ? (await Model.create([data], { session }))[0] : await Model.create(data);
      if (created) created.employee = employee;
      await users.linkEmployeeAccount(provisionedUser._id, employee._id, { session });
      return {
        employee,
        accountProvisioning: {
          userId: String(provisionedUser._id),
          email: normalizedEmail,
          temporaryPassword: account.temporaryPassword,
          mustChangePassword: true,
        },
      };
    };
    try {
      if (transactionCapable()) {
        const session = await mongoose.startSession();
        try {
          let result;
          await session.withTransaction(async () => { result = await persist(session); });
          return result;
        } finally {
          await session.endSession();
        }
      }
      const created = {};
      try {
        return await persist(null, created);
      } catch (error) {
        if (created.employee) await Model.deleteOne({ _id: created.employee._id });
        if (created.user) await users.removeProvisionedEmployeeAccount(created.user._id);
        throw error;
      }
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
    const mapping = { departmentId: 'department', managerId: 'manager', workingScheduleId: 'workingSchedule' };
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
    if (employee.user) await users.assertEmployeeAccountLink(employee.user, employee._id);
    const previousStatus = employee.employmentStatus;
    employee.employmentStatus = employmentStatus;
    await employee.save();
    if (employee.user) {
      try {
        await users.setLinkedEmployeeAccountStatus(employee.user, employee._id, employmentStatus);
      } catch (error) {
        employee.employmentStatus = previousStatus;
        await employee.save();
        throw error;
      }
    }
    return employee;
  }
  async function resolveEmployeeForUser(userId) {
    if (!userId || !mongoose.isObjectIdOrHexString(userId)) {
      throw new AppError('RESOURCE_NOT_FOUND', 'No Employee is linked to this User.', 404);
    }
    const employee = await Model.findOne({ user: userId });
    if (!employee) throw new AppError('RESOURCE_NOT_FOUND', 'No Employee is linked to this User.', 404);
    return employee;
  }
  async function getOwnEmployee(actor) {
    return resolveEmployeeForUser(actor?.id ?? actor?._id);
  }
  async function assertOwnership(employeeId, actor) {
    const employee = await resolveEmployeeForUser(actor?.id ?? actor?._id);
    if (String(employee._id) !== String(employeeId)) {
      throw new AppError('EMP-005', 'Employee cannot access another Employee record.', 403);
    }
    return employee;
  }
  return {
    listEmployees, createEmployee, getEmployee, updateEmployee, getOwnEmployee, resolveEmployeeForUser, assertOwnership,
    activateEmployee: id => setEmploymentStatus(id, 'ACTIVE'),
    deactivateEmployee: id => setEmploymentStatus(id, 'INACTIVE'),
  };
}

module.exports = { createEmployeeService, ...createEmployeeService() };
