'use strict';

const AppError = require('./AppError');

module.exports = function persistenceError(error, duplicateCode = 'DUPLICATE_CODE') {
  if (error.code === 11000) return new AppError(duplicateCode, 'Code already exists.', 409);
  if (error.name === 'VersionError') return new AppError('RESOURCE_CONFLICT', 'Record changed; reload and retry.', 409);
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return new AppError('VALIDATION_ERROR', 'Invalid resource values.', 400);
  }
  return error;
};
