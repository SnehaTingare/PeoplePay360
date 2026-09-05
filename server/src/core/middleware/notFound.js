'use strict';

const AppError = require('../errors/AppError');
const errors = require('../errors/errorCodes');

module.exports = (req, res, next) => {
  const error = errors.RESOURCE_NOT_FOUND;
  next(new AppError(error.code, error.message, error.statusCode));
};
