'use strict';

class AppError extends Error {
  constructor(code, message, statusCode = 422, severity = 'ERROR', details = {}) {
    super(message);
    this.name = 'AppError';
    Object.assign(this, { code, statusCode, severity, details });
  }
}

module.exports = AppError;
