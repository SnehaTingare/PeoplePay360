'use strict';

const defaultService = require('./timeOff.service');
const response = require('../../core/http/response');
const roles = require('../../core/constants/roles');

module.exports = function createTimeOffController(service = defaultService) {
  const scope = req => ({ activeOnly: req.user.role === roles.EMPLOYEE });
  return {
    myAllocations: async (req, res) => response.collection(res, await service.listAllocations(req.query, req.user, true)),
    listAllocations: async (req, res) => response.collection(res, await service.listAllocations(req.query, req.user)),
    createAllocation: async (req, res) => response.resource(res, await service.createAllocation(req.body, req.user), 201),
    getAllocation: async (req, res) => response.resource(res, await service.getAllocation(req.params.id, req.user)),
    myRequests: async (req, res) => response.collection(res, await service.listRequests(req.query, req.user, true)),
    listRequests: async (req, res) => response.collection(res, await service.listRequests(req.query, req.user)),
    createRequest: async (req, res) => response.resource(res, await service.createRequest(req.body, req.user), 201),
    getRequest: async (req, res) => response.resource(res, await service.getRequest(req.params.id, req.user)),
    updateAllocation: async (req, res) => response.resource(res, await service.updateAllocation(req.params.id, req.body, req.user)),
    approveAllocation: async (req, res) => response.resource(res, await service.approveAllocation(req.params.id, req.user)),
    cancelAllocation: async (req, res) => response.resource(res, await service.cancelAllocation(req.params.id, req.user)),
    deleteAllocation: async (req, res) => response.resource(res, await service.deleteAllocation(req.params.id, req.user)),
    approveRequest: async (req, res) => response.resource(res, await service.approveRequest(req.params.id, req.user)),
    refuseRequest: async (req, res) => response.resource(res, await service.refuseRequest(req.params.id, req.body, req.user)),
    listTypes: async (req, res) => response.collection(res, await service.listTypes(req.query, scope(req))),
    createType: async (req, res) => response.resource(res, await service.createType(req.body), 201),
    getType: async (req, res) => response.resource(res, await service.getType(req.params.id, scope(req))),
    updateType: async (req, res) => response.resource(res, await service.updateType(req.params.id, req.body)),
    deactivateType: async (req, res) => response.resource(res, await service.deactivateType(req.params.id)),
  };
};
