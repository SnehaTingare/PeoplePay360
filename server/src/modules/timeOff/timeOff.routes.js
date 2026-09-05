'use strict';

const { Router } = require('express');
const authorize = require('../../core/middleware/authorize');
const validateRequest = require('../../core/middleware/validateRequest');
const roles = require('../../core/constants/roles');
const validation = require('./timeOff.validation');
const createController = require('./timeOff.controller');

// Group 1 mounts this router under /api/v1 with its real authenticate middleware.
// Refuse to construct an unsecured router while shared authentication is absent.
module.exports = function createTimeOffRouter({ authenticate, service } = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('Time Off routes require shared authenticate middleware.');
  const router = Router();
  const controller = createController(service);
  const manage = [roles.HR_MANAGER, roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN];
  const id = validateRequest(req => validation.id(req.params.id));
  router.use(authenticate);
  router.get('/time-off/types', authorize(...Object.values(roles)), validateRequest(req => validation.listQuery(req.query)), controller.listTypes);
  router.post('/time-off/types', authorize(...manage), validateRequest(req => validation.typeInput(req.body)), controller.createType);
  router.get('/time-off/types/:id', authorize(...Object.values(roles)), id, controller.getType);
  router.patch('/time-off/types/:id', authorize(...manage), id, validateRequest(req => validation.typeInput(req.body, true)), controller.updateType);
  router.post('/time-off/types/:id/deactivate', authorize(...manage), id, controller.deactivateType);
  router.get('/time-off/allocations/me', authorize(roles.EMPLOYEE), validateRequest(req => validation.leaveQuery(req.query, true, true)), controller.myAllocations);
  router.get('/time-off/allocations', authorize(...manage), validateRequest(req => validation.leaveQuery(req.query, true)), controller.listAllocations);
  router.post('/time-off/allocations', authorize(...manage), validateRequest(req => validation.allocationInput(req.body)), controller.createAllocation);
  router.get('/time-off/allocations/:id', authorize(...Object.values(roles)), id, controller.getAllocation);
  router.patch('/time-off/allocations/:id', authorize(...manage), id, validateRequest(req => validation.allocationInput(req.body, true)), controller.updateAllocation);
  router.post('/time-off/allocations/:id/approve', authorize(...manage), id, controller.approveAllocation);
  router.post('/time-off/allocations/:id/cancel', authorize(...manage), id, controller.cancelAllocation);
  router.delete('/time-off/allocations/:id', authorize(...manage), id, controller.deleteAllocation);
  router.get('/time-off/requests/me', authorize(roles.EMPLOYEE), validateRequest(req => validation.leaveQuery(req.query, false, true)), controller.myRequests);
  router.get('/time-off/requests', authorize(...manage), validateRequest(req => validation.leaveQuery(req.query)), controller.listRequests);
  router.post('/time-off/requests', authorize(...Object.values(roles)), validateRequest(req => validation.requestInput(req.body, req.user.role === roles.EMPLOYEE)), controller.createRequest);
  router.get('/time-off/requests/:id', authorize(...Object.values(roles)), id, controller.getRequest);
  router.post('/time-off/requests/:id/approve', authorize(...manage), id, controller.approveRequest);
  router.post('/time-off/requests/:id/refuse', authorize(...manage), id, validateRequest(req => validation.decisionInput(req.body)), controller.refuseRequest);
  return router;
};
