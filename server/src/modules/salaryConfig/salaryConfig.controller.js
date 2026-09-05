'use strict';

const defaultService = require('./salaryConfig.service');
const response = require('../../core/http/response');

module.exports = function createSalaryConfigController(service = defaultService) {
  return {
    listStructures: async (req, res) => response.collection(res, await service.listStructures(req.query)),
    createStructure: async (req, res) => response.resource(res, await service.createStructure(req.body), 201),
    getStructure: async (req, res) => response.resource(res, await service.getStructure(req.params.id)),
    updateStructure: async (req, res) => response.resource(res, await service.updateStructure(req.params.id, req.body)),
    activateStructure: async (req, res) => response.resource(res, await service.activateStructure(req.params.id)),
    deactivateStructure: async (req, res) => response.resource(res, await service.deactivateStructure(req.params.id)),
    deleteStructure: async (req, res) => response.resource(res, await service.deleteStructure(req.params.id)),
    listRules: async (req, res) => response.collection(res, await service.listRules(req.query)),
    createRule: async (req, res) => response.resource(res, await service.createRule(req.body), 201),
    getRule: async (req, res) => response.resource(res, await service.getRule(req.params.id)),
    updateRule: async (req, res) => response.resource(res, await service.updateRule(req.params.id, req.body)),
    activateRule: async (req, res) => response.resource(res, await service.activateRule(req.params.id)),
    deactivateRule: async (req, res) => response.resource(res, await service.deactivateRule(req.params.id)),
    deleteRule: async (req, res) => response.resource(res, await service.deleteRule(req.params.id)),
  };
};
