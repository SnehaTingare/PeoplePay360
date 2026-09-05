'use strict';

const { Router } = require('express');
const roles = require('../../core/constants/roles');
const AppError = require('../../core/errors/AppError');
const errors = require('../../core/errors/errorCodes');
const asyncHandler = require('../../core/middleware/asyncHandler');
const authenticate = require('../../core/middleware/authenticate');
const authorize = require('../../core/middleware/authorize');
const validateRequest = require('../../core/middleware/validateRequest');
const controller = require('./user.controller');
const validation = require('./user.validation');

const router = Router();
const apply = validator => validateRequest(req => {
  const validated = validator({ body: req.body, params: req.params, query: req.query });
  if (validated.body) req.body = validated.body;
  if (validated.params) req.params = validated.params;
  if (validated.query) req.validatedQuery = validated.query;
});
const requireChangedPassword = (req, res, next) => {
  if (!req.user.mustChangePassword) return next();
  const error = errors.AUTH_MUST_CHANGE_PASSWORD;
  return next(new AppError(error.code, error.message, error.statusCode));
};

router.use(authenticate, authorize(roles.ADMIN), requireChangedPassword);
router.get('/', apply(validation.validateListUsers), asyncHandler(controller.listUsers));
router.post('/', apply(validation.validateCreateUser), asyncHandler(controller.createUser));
router.get('/:id', apply(validation.validateUserId), asyncHandler(controller.getUser));
router.patch('/:id', apply(validation.validateUpdateUser), asyncHandler(controller.updateUser));
router.patch('/:id/role', apply(validation.validateChangeRole), asyncHandler(controller.changeRole));
router.post('/:id/activate', apply(validation.validateUserId), asyncHandler(controller.activateUser));
router.post('/:id/deactivate', apply(validation.validateUserId), asyncHandler(controller.deactivateUser));
router.post('/:id/reset-password', apply(validation.validateUserId), asyncHandler(controller.resetPassword));

module.exports = router;
