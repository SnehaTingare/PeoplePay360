'use strict';

const { Router } = require('express');
const roles = require('../../core/constants/roles');
const authorize = require('../../core/middleware/authorize');
const asyncHandler = require('../../core/middleware/asyncHandler');
const validateRequest = require('../../core/middleware/validateRequest');
const validation = require('./report.validation');
const createController = require('./report.controller');

module.exports = function createReportRouter({ authenticate, service } = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('Report routes require shared authenticate middleware.');
  const router = Router();
  const controller = createController(service);
  router.use(authenticate, authorize(roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN));
  router.get('/payroll', validateRequest(req => { const result = validation.dashboard({ query: req.query }); req.validatedQuery = result.query; }), asyncHandler(controller.payrollDashboard));
  return router;
};
