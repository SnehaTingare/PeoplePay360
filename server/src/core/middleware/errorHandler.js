'use strict';

const AppError = require('../errors/AppError');

// Express recognizes error middleware by its four-argument signature.
module.exports = function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const known = error instanceof AppError;
  res.status(known ? error.statusCode : 500).json({
    code: known ? error.code : 'INTERNAL_ERROR',
    message: known ? error.message : 'An unexpected error occurred.',
    severity: known ? error.severity : 'ERROR',
    details: known ? error.details : {},
  });
};
