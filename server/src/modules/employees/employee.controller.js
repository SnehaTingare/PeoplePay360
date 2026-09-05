'use strict';

const response = require('../../core/http/response');
const defaultService = require('./employee.service');

module.exports = function createEmployeeController(service = defaultService) {
  return {
    me: async (req, res) => response.resource(res, await service.getOwnEmployee(req.user)),
    list: async (req, res) => response.collection(res, await service.listEmployees(req.validatedQuery)),
    create: async (req, res) => response.resource(res, await service.createEmployee(req.body), 201),
    get: async (req, res) => response.resource(res, await service.getEmployee(req.params.id)),
    update: async (req, res) => response.resource(res, await service.updateEmployee(req.params.id, req.body)),
    activate: async (req, res) => response.resource(res, await service.activateEmployee(req.params.id)),
    deactivate: async (req, res) => response.resource(res, await service.deactivateEmployee(req.params.id)),
  };
};
