'use strict';

const response = require('../../core/http/response');
const defaultService = require('./department.service');

module.exports = function createDepartmentController(service = defaultService) {
  return {
    list: async (req, res) => response.collection(res, await service.listDepartments(req.validatedQuery)),
    create: async (req, res) => response.resource(res, await service.createDepartment(req.body), 201),
    get: async (req, res) => response.resource(res, await service.getDepartment(req.params.id)),
    update: async (req, res) => response.resource(res, await service.updateDepartment(req.params.id, req.body)),
    deactivate: async (req, res) => response.resource(res, await service.deactivateDepartment(req.params.id)),
  };
};
