'use strict';

const { Router } = require('express');
const roles = require('../../core/constants/roles');
const asyncHandler = require('../../core/middleware/asyncHandler');
const authorize = require('../../core/middleware/authorize');
const validateRequest = require('../../core/middleware/validateRequest');
const validation = require('./employee.validation');
const createController = require('./employee.controller');

module.exports = function createEmployeeRouter({ authenticate, service } = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('Employee routes require shared authenticate middleware.');
  const router = Router();
  const controller = createController(service);
  const managers = [roles.HR_MANAGER, roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN];
  const apply = validator => validateRequest(req => {
    const validated = validator({ body: req.body, params: req.params, query: req.query });
    if (validated.body) req.body = validated.body;
    if (validated.params) req.params = validated.params;
    if (validated.query) req.validatedQuery = validated.query;
  });
  router.use(authenticate);
  router.get('/me', authorize(roles.EMPLOYEE), asyncHandler(controller.me));
  router.get('/', authorize(...managers), apply(validation.validateList), asyncHandler(controller.list));
  router.post('/', authorize(...managers), apply(validation.validateCreate), asyncHandler(controller.create));
  router.get('/:id', authorize(...managers), apply(validation.validateId), asyncHandler(controller.get));
  router.patch('/:id', authorize(...managers), apply(validation.validateUpdate), asyncHandler(controller.update));
  router.post('/:id/activate', authorize(...managers), apply(validation.validateId), asyncHandler(controller.activate));
  router.post('/:id/deactivate', authorize(...managers), apply(validation.validateId), asyncHandler(controller.deactivate));
  return router;
};
