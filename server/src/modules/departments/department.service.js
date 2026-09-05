'use strict';

const mongoose = require('mongoose');
const Department = require('./department.model');
const AppError = require('../../core/errors/AppError');
const persistenceError = require('../../core/errors/persistenceError');
const paginate = require('../../core/http/pagination');

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function createDepartmentService({ Model = Department } = {}) {
  async function getDepartment(id) {
    if (!mongoose.isObjectIdOrHexString(id)) throw new AppError('RESOURCE_NOT_FOUND', 'Department not found.', 404);
    const department = await Model.findById(id);
    if (!department) throw new AppError('RESOURCE_NOT_FOUND', 'Department not found.', 404);
    return department;
  }

  async function listDepartments({ q, active, page, limit }) {
    const filter = {};
    if (active !== undefined) filter.active = active;
    if (q) {
      const search = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: search }, { code: search }];
    }
    return paginate(Model, filter, { page, limit }, { name: 1, _id: 1 });
  }

  async function createDepartment(input) {
    try {
      return await Model.create({
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description,
        manager: input.managerId ?? null,
        active: true,
      });
    } catch (error) {
      throw persistenceError(error, 'DUPLICATE_CODE');
    }
  }

  async function updateDepartment(id, input) {
    const department = await getDepartment(id);
    const changes = { ...input };
    if (changes.code !== undefined) changes.code = changes.code.toUpperCase();
    if (Object.hasOwn(changes, 'managerId')) {
      changes.manager = changes.managerId;
      delete changes.managerId;
    }
    department.set(changes);
    try {
      return await department.save();
    } catch (error) {
      throw persistenceError(error, 'DUPLICATE_CODE');
    }
  }

  async function deactivateDepartment(id) {
    const department = await getDepartment(id);
    department.active = false;
    try {
      return await department.save();
    } catch (error) {
      throw persistenceError(error);
    }
  }

  const findByIds = ids => Model.find({ _id: { $in: ids } });

  return { listDepartments, createDepartment, getDepartment, updateDepartment, deactivateDepartment, findByIds };
}

module.exports = { createDepartmentService, ...createDepartmentService() };
