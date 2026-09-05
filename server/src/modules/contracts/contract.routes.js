'use strict';

const { Router } = require('express');
const roles = require('../../core/constants/roles');
const asyncHandler = require('../../core/middleware/asyncHandler');
const authorize = require('../../core/middleware/authorize');
const validateRequest = require('../../core/middleware/validateRequest');
const validation = require('./contract.validation');
const createController = require('./contract.controller');

module.exports = function createContractRouter({ authenticate, service } = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('Contract routes require shared authenticate middleware.');
  const router = Router();
  const controller = createController(service);
  const managers = [roles.HR_MANAGER, roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN];
  const apply = validator => validateRequest(req => {
    const validated = validator({ body: req.body, params: req.params, query: req.query });
    if (validated.body) req.body = validated.body;
    if (validated.params) req.params = validated.params;
    if (validated.query) req.validatedQuery = validated.query;
  });

  router.use(authenticate, authorize(...managers));
  router.get('/', apply(validation.validateList), asyncHandler(controller.list));
  router.post('/', apply(validation.validateCreate), asyncHandler(controller.create));
  router.post('/:id/start', apply(validation.validateId), asyncHandler(controller.start));
  router.post('/:id/cancel', apply(validation.validateId), asyncHandler(controller.cancel));
  router.post('/:id/expire', apply(validation.validateId), asyncHandler(controller.expire));
  router.get('/:id', apply(validation.validateId), asyncHandler(controller.get));
  router.patch('/:id', apply(validation.validateUpdate), asyncHandler(controller.update));
  router.delete('/:id', apply(validation.validateId), asyncHandler(controller.remove));
  return router;
};
