'use strict';

const { Router } = require('express');
const authorize = require('../../core/middleware/authorize');
const validateRequest = require('../../core/middleware/validateRequest');
const roles = require('../../core/constants/roles');
const validation = require('./salaryConfig.validation');
const createController = require('./salaryConfig.controller');

// Mount under /api/v1 after Group 1 supplies shared authentication.
module.exports = function createSalaryConfigRouter({ authenticate, service } = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('Salary routes require shared authenticate middleware.');
  const router = Router();
  const controller = createController(service);
  const read = [roles.HR_PAYROLL_USER, roles.HR_PAYROLL_MANAGER, roles.ADMIN];
  const manage = [roles.HR_PAYROLL_MANAGER, roles.ADMIN];
  const id = validateRequest(req => validation.id(req.params.id));
  router.use(authenticate);
  router.get('/payroll/structures', authorize(...read), validateRequest(req => validation.listStructures(req.query)), controller.listStructures);
  router.post('/payroll/structures', authorize(...manage), validateRequest(req => validation.structureInput(req.body)), controller.createStructure);
  router.get('/payroll/structures/:id', authorize(...read), id, controller.getStructure);
  router.patch('/payroll/structures/:id', authorize(...manage), id, validateRequest(req => validation.structureInput(req.body, true)), controller.updateStructure);
  router.post('/payroll/structures/:id/activate', authorize(...manage), id, controller.activateStructure);
  router.post('/payroll/structures/:id/deactivate', authorize(...manage), id, controller.deactivateStructure);
  router.delete('/payroll/structures/:id', authorize(...manage), id, controller.deleteStructure);
  router.get('/payroll/rules', authorize(...read), validateRequest(req => validation.listRules(req.query)), controller.listRules);
  router.post('/payroll/rules', authorize(...manage), validateRequest(req => validation.ruleInput(req.body)), controller.createRule);
  router.get('/payroll/rules/:id', authorize(...read), id, controller.getRule);
  router.patch('/payroll/rules/:id', authorize(...manage), id, validateRequest(req => validation.ruleInput(req.body, true)), controller.updateRule);
  router.post('/payroll/rules/:id/activate', authorize(...manage), id, controller.activateRule);
  router.post('/payroll/rules/:id/deactivate', authorize(...manage), id, controller.deactivateRule);
  router.delete('/payroll/rules/:id', authorize(...manage), id, controller.deleteRule);
  return router;
};
