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
  return router;
};
