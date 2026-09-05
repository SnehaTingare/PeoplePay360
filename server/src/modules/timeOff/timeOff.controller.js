'use strict';

const defaultService = require('./timeOff.service');
const response = require('../../core/http/response');
const roles = require('../../core/constants/roles');

module.exports = function createTimeOffController(service = defaultService) {
  const scope = req => ({ activeOnly: req.user.role === roles.EMPLOYEE });
  return {
    listTypes: async (req, res) => response.collection(res, await service.listTypes(req.query, scope(req))),
    createType: async (req, res) => response.resource(res, await service.createType(req.body), 201),
    getType: async (req, res) => response.resource(res, await service.getType(req.params.id, scope(req))),
    updateType: async (req, res) => response.resource(res, await service.updateType(req.params.id, req.body)),
    deactivateType: async (req, res) => response.resource(res, await service.deactivateType(req.params.id)),
  };
};
