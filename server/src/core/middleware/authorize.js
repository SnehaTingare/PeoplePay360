'use strict';

const AppError = require('../errors/AppError');

// Authentication must establish req.user before this middleware runs.
module.exports = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('AUTH-002', 'Authentication required.', 401));
  if (req.user.status !== 'ACTIVE') {
    return next(new AppError('AUTH-004', 'Account is inactive.', 403));
  }
  if (!roles.includes(req.user.role)) {
    return next(new AppError('AUTH-003', 'You do not have permission for this action.', 403));
  }
  next();
};
