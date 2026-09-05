'use strict';

const response = require('../../core/http/response');
const defaultService = require('./contract.service');

module.exports = function createContractController(service = defaultService) {
  return {
    list: async (req, res) => response.collection(res, await service.listContracts(req.validatedQuery)),
    create: async (req, res) => response.resource(res, await service.createContract(req.body), 201),
    get: async (req, res) => response.resource(res, await service.getContract(req.params.id)),
    update: async (req, res) => response.resource(res, await service.updateContract(req.params.id, req.body)),
    start: async (req, res) => response.resource(res, await service.startContract(req.params.id)),
    cancel: async (req, res) => response.resource(res, await service.cancelContract(req.params.id)),
    expire: async (req, res) => response.resource(res, await service.expireContract(req.params.id)),
    remove: async (req, res) => response.resource(res, await service.deleteContract(req.params.id)),
  };
};
