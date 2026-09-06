'use strict';

const { Router } = require('express');
const roles = require('../../core/constants/roles');
const authorize = require('../../core/middleware/authorize');
const validateRequest = require('../../core/middleware/validateRequest');
const asyncHandler = require('../../core/middleware/asyncHandler');
const validation = require('./payslip.validation');
const createController = require('./payslip.controller');

module.exports = function createPayslipRouter({ authenticate, service } = {}) {
  if (typeof authenticate !== 'function') {
    throw new TypeError('Payslip routes require shared authenticate middleware.');
  }

  const router = Router();
  const controller = createController(service);
  const payrollRoles = [roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN];
  const detailRoles = [...payrollRoles, roles.EMPLOYEE];
  const apply = validator => validateRequest(req => {
    const result = validator({ query: req.query, params: req.params });
    if (result.query) req.validatedQuery = result.query;
    if (result.params) req.params = result.params;
  });

  router.use(authenticate);
  router.get('/me', authorize(roles.EMPLOYEE), apply(validation.ownList), asyncHandler(controller.me));
  router.get('/', authorize(...payrollRoles), apply(validation.list), asyncHandler(controller.list));
  router.get('/:id/pdf', authorize(...detailRoles), apply(validation.params), asyncHandler(controller.pdf));
  router.get('/:id', authorize(...detailRoles), apply(validation.params), asyncHandler(controller.get));

  return router;
};
