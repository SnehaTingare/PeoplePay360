'use strict';

const { Router } = require('express');
const asyncHandler = require('../../core/middleware/asyncHandler');
const validateRequest = require('../../core/middleware/validateRequest');
const validation = require('./notification.validation');
const createController = require('./notification.controller');

module.exports = function createNotificationRouter({ authenticate, service } = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('Notification routes require shared authenticate middleware.');
  const router = Router();
  const controller = createController(service);
  const apply = validator => validateRequest(req => { const result = validator({ query: req.query, params: req.params }); if (result.query) req.validatedQuery = result.query; if (result.params) req.params = result.params; });
  router.use(authenticate);
  router.get('/', apply(validation.list), asyncHandler(controller.list));
  router.patch('/read-all', asyncHandler(controller.readAll));
  router.patch('/:id/read', apply(validation.params), asyncHandler(controller.read));
  return router;
};
