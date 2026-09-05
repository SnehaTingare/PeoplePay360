'use strict';

const mongoose = require('mongoose');
const Employee = require('./employee.model');
const departmentService = require('../departments/department.service');
const scheduleService = require('../schedules/schedule.service');
const userService = require('../users/user.service');
const accountEmailService = require('../notifications/accountEmail.service');
const AppError = require('../../core/errors/AppError');
const paginate = require('../../core/http/pagination');

const escapeRegex = value =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const duplicateField = (error, field) =>
  error?.code === 11000 &&
  Boolean(error.keyPattern?.[field]);

const transactionCapable = () => {
  const topology =
    mongoose.connection.client?.topology?.description?.type;

  return (
    mongoose.connection.readyState === 1 &&
    ['ReplicaSetWithPrimary', 'Sharded'].includes(topology)
  );
};

function createEmployeeService({
  Model = Employee,
  departments = departmentService,
  schedules = scheduleService,
  users = userService,
  emails = accountEmailService,
} = {}) {

  async function getEmployee(id) {
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        'Employee not found.',
        404
      );
    }

    const employee = await Model.findById(id);

    if (!employee) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        'Employee not found.',
        404
      );
    }

    return employee;
  }

  async function validateRelationships(
    input,
    employeeId = null
  ) {
    if (input.departmentId !== undefined) {
      await departments.getDepartment(
        input.departmentId
      );
    }

    if (input.workingScheduleId !== undefined) {
      await schedules.getSchedule(
        input.workingScheduleId
      );
    }

    if (input.managerId) {
      if (
        employeeId &&
        String(input.managerId) === String(employeeId)
      ) {
        throw new AppError(
          'EMP-002',
          'Employee cannot be their own manager.',
          422
        );
      }

      const manager = await getEmployee(input.managerId);

      if (
        manager.employmentStatus !== 'ACTIVE' ||
        manager.jobPosition !== 'Manager'
      ) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Manager must be an active employee with job position Manager.',
          422
        );
      }
    }
  }

  async function listEmployees({
    q,
    departmentId,
    employeeType,
    employmentStatus,
    managerId,
    page,
    limit,
  }) {
    const filter = {};

    if (q) {
      const search = new RegExp(
        escapeRegex(q),
        'i'
      );

      filter.$or = [
        { firstName: search },
        { lastName: search },
        { email: search },
        { employeeId: search },
      ];
    }

    if (departmentId) {
      filter.department = departmentId;
    }

    if (employeeType) {
      filter.employeeType = employeeType;
    }

    if (employmentStatus) {
      filter.employmentStatus =
        employmentStatus;
    }

    if (managerId) {
      filter.manager = managerId;
    }

    return paginate(
      Model,
      filter,
      { page, limit },
      {
        firstName: 1,
        lastName: 1,
        _id: 1,
      }
    );
  }

  async function createEmployee(input) {
    const objectId =
      new mongoose.Types.ObjectId();

    const _id =
      objectId.toHexString();

    const normalizedEmail =
      input.email.toLowerCase();

    await validateRelationships(
      input,
      _id
    );

    if (
      await Model.exists({
        email: normalizedEmail,
      })
    ) {
      throw new AppError(
        'EMP-001',
        'Employee email already exists.',
        409
      );
    }

    await users.assertEmployeeAccountEmailAvailable(
      normalizedEmail
    );

    const persist = async (
      session,
      created = null
    ) => {
      const account =
        await users.provisionEmployeeAccount(
          {
            firstName: input.firstName,
            lastName: input.lastName,
            email: normalizedEmail,
          },
          { session }
        );

      const provisionedUser =
        account.user;

      if (created) {
        created.user =
          provisionedUser;
      }

      const data = {
        _id,

        employeeId:
          `PP360-E-${objectId
            .toHexString()
            .slice(-8)
            .toUpperCase()}`,

        user:
          provisionedUser._id,

        firstName:
          input.firstName,

        lastName:
          input.lastName,

        email:
          normalizedEmail,

        phone:
          input.phone,

        department:
          input.departmentId,

        jobPosition:
          input.jobPosition,

        manager:
          input.managerId ?? null,

        employeeType:
          input.employeeType,

        workingSchedule:
          input.workingScheduleId,

        joiningDate:
          input.joiningDate,

        bankDetails:
          input.bankDetails ?? null,

        employmentStatus:
          'ACTIVE',
      };

      const employee = session
        ? (
            await Model.create(
              [data],
              { session }
            )
          )[0]
        : await Model.create(data);

      if (created) {
        created.employee =
          employee;
      }

      await users.linkEmployeeAccount(
        provisionedUser._id,
        employee._id,
        { session }
      );

      return {
        employee,

        accountProvisioning: {
          userId:
            String(
              provisionedUser._id
            ),

          email:
            normalizedEmail,

          temporaryPassword:
            account.temporaryPassword,

          mustChangePassword:
            true,
        },
      };
    };

    let result;

    try {
      if (transactionCapable()) {
        const session =
          await mongoose.startSession();

        try {
          await session.withTransaction(
            async () => {
              result =
                await persist(
                  session
                );
            }
          );

        } finally {
          await session.endSession();
        }
      } else {
        const created = {};

        try {
          result = await persist(
            null,
            created
          );
        } catch (error) {
          if (created.employee) {
            await Model.deleteOne({
              _id:
                created.employee._id,
            });
          }

          if (created.user) {
            await users.removeProvisionedEmployeeAccount(
              created.user._id
            );
          }

          throw error;
        }
      }

    } catch (error) {
      if (
        duplicateField(
          error,
          'email'
        )
      ) {
        throw new AppError(
          'EMP-001',
          'Employee email already exists.',
          409
        );
      }

      if (
        duplicateField(
          error,
          'user'
        )
      ) {
        throw new AppError(
          'RESOURCE_CONFLICT',
          'User is already linked to another Employee.',
          409
        );
      }

      throw error;
    }

    let emailDelivery = 'SENT';

    try {
      await emails.sendTemporaryPassword({
        to: result.accountProvisioning.email,
        firstName: input.firstName,
        temporaryPassword:
          result.accountProvisioning.temporaryPassword,
      });
    } catch {
      emailDelivery = 'FAILED';
    }

    result.accountProvisioning.emailDelivery =
      emailDelivery;

    return result;
  }

  async function updateEmployee(
    id,
    input
  ) {
    const employee =
      await getEmployee(id);

    await validateRelationships(
      input,
      employee._id
    );

    if (
      input.email &&
      await Model.exists({
        email:
          input.email.toLowerCase(),

        _id: {
          $ne:
            employee._id,
        },
      })
    ) {
      throw new AppError(
        'EMP-001',
        'Employee email already exists.',
        409
      );
    }

    const changes = {
      ...input,
    };

    const mapping = {
      departmentId:
        'department',

      managerId:
        'manager',

      workingScheduleId:
        'workingSchedule',
    };

    for (
      const [
        source,
        target,
      ] of Object.entries(mapping)
    ) {
      if (
        Object.hasOwn(
          changes,
          source
        )
      ) {
        changes[target] =
          changes[source];

        delete changes[source];
      }
    }

    employee.set(changes);

    try {
      return await employee.save();

    } catch (error) {
      if (
        duplicateField(
          error,
          'email'
        )
      ) {
        throw new AppError(
          'EMP-001',
          'Employee email already exists.',
          409
        );
      }

      if (
        duplicateField(
          error,
          'user'
        )
      ) {
        throw new AppError(
          'RESOURCE_CONFLICT',
          'User is already linked to another Employee.',
          409
        );
      }

      throw error;
    }
  }

  async function setEmploymentStatus(
    id,
    employmentStatus
  ) {
    const employee =
      await getEmployee(id);

    if (employee.user) {
      await users.assertEmployeeAccountLink(
        employee.user,
        employee._id
      );
    }

    const previousStatus =
      employee.employmentStatus;

    employee.employmentStatus =
      employmentStatus;

    await employee.save();

    if (employee.user) {
      try {
        await users.setLinkedEmployeeAccountStatus(
          employee.user,
          employee._id,
          employmentStatus
        );

      } catch (error) {
        employee.employmentStatus =
          previousStatus;

        await employee.save();

        throw error;
      }
    }

    return employee;
  }

  async function findPayrollCandidates({
    departmentId,
    employeeType,
  } = {}) {
    const filter = {
      employmentStatus:
        'ACTIVE',
    };

    if (departmentId) {
      filter.department =
        departmentId;
    }

    if (employeeType) {
      filter.employeeType =
        employeeType;
    }

    return Model.find(filter)
      .sort({
        firstName: 1,
        lastName: 1,
        _id: 1,
      });
  }

  async function getEmployeesByIds(
    ids
  ) {
    const employees =
      await Model.find({
        _id: {
          $in: ids,
        },
      });

    const byId =
      new Map(
        employees.map(
          employee => [
            String(
              employee._id
            ),
            employee,
          ]
        )
      );

    return ids
      .map(
        id =>
          byId.get(
            String(id)
          )
      )
      .filter(Boolean);
  }

  async function getEmployeeIdsByDepartment(
    departmentId
  ) {
    if (
      !mongoose.isObjectIdOrHexString(
        departmentId
      )
    ) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        'Department not found.',
        404
      );
    }

    return (
      await Model.find({
        department:
          departmentId,
      }).select('_id')
    ).map(
      employee =>
        String(
          employee._id
        )
    );
  }

  async function lockEmployeeForLeave(
    id,
    { session } = {}
  ) {
    if (
      !mongoose.isObjectIdOrHexString(
        id
      )
    ) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        'Employee not found.',
        404
      );
    }

    const employee =
      await Model.findOneAndUpdate(
        { _id: id },
        {
          $inc: {
            __v: 1,
          },
        },
        {
          new: true,
          session,
        }
      );

    if (!employee) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        'Employee not found.',
        404
      );
    }

    return employee;
  }

  async function findForReporting({
    departmentId,
    employeeType,
  } = {}) {
    const filter = {};

    if (departmentId) {
      filter.department =
        departmentId;
    }

    if (employeeType) {
      filter.employeeType =
        employeeType;
    }

    return Model.find(filter);
  }

  // =========================================================
  // USER -> EMPLOYEE RESOLUTION
  // =========================================================

  async function resolveEmployeeForUser(
    userId
  ) {
    if (
      !userId ||
      !mongoose.isObjectIdOrHexString(
        userId
      )
    ) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        'No Employee is linked to this User.',
        404
      );
    }

    const employee =
      await Model.findOne({
        user: userId,
      });

    if (!employee) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        'No Employee is linked to this User.',
        404
      );
    }

    return employee;
  }

  /*
   * Compatibility/public service method used by
   * Attendance and Time Off modules.
   *
   * Do not duplicate lookup logic here.
   * The authoritative implementation remains
   * resolveEmployeeForUser().
   */
  async function getEmployeeForUser(
    userId
  ) {
    return resolveEmployeeForUser(
      userId
    );
  }

  async function getOwnEmployee(
    actor
  ) {
    return resolveEmployeeForUser(
      actor?.id ??
        actor?._id
    );
  }

  async function getOwnEmployeeProfile(actor) {
    const employee = await getOwnEmployee(actor);
    const schedule = await schedules.getSchedule(employee.workingSchedule);
    return { ...employee.toObject(), workingSchedule: schedule };
  }

  async function assertOwnership(
    employeeId,
    actor
  ) {
    const employee =
      await resolveEmployeeForUser(
        actor?.id ??
          actor?._id
      );

    if (
      String(employee._id) !==
      String(employeeId)
    ) {
      throw new AppError(
        'EMP-005',
        'Employee cannot access another Employee record.',
        403
      );
    }

    return employee;
  }

  return {
    listEmployees,

    findPayrollCandidates,

    getEmployeesByIds,

    getEmployeeIdsByDepartment,

    lockEmployeeForLeave,

    findForReporting,

    createEmployee,

    getEmployee,

    updateEmployee,

    // Important self-service helpers
    getOwnEmployee,
    getOwnEmployeeProfile,

    resolveEmployeeForUser,

    // ✅ NEW ALIAS REQUIRED BY ATTENDANCE / TIME OFF
    getEmployeeForUser,

    assertOwnership,

    activateEmployee:
      id =>
        setEmploymentStatus(
          id,
          'ACTIVE'
        ),

    deactivateEmployee:
      id =>
        setEmploymentStatus(
          id,
          'INACTIVE'
        ),
  };
}

module.exports = {
  createEmployeeService,
  ...createEmployeeService(),
};
