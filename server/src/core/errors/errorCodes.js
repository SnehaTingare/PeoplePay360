'use strict';

module.exports = Object.freeze({
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH-001', message: 'Invalid email or password.', statusCode: 401 },
  AUTH_INVALID_TOKEN: { code: 'AUTH-002', message: 'Authentication token is missing or invalid.', statusCode: 401 },
  AUTH_FORBIDDEN: { code: 'AUTH-003', message: 'You do not have permission to perform this action.', statusCode: 403 },
  AUTH_INACTIVE: { code: 'AUTH-004', message: 'User account is inactive.', statusCode: 403 },
  AUTH_MUST_CHANGE_PASSWORD: { code: 'AUTH-005', message: 'Password change is required.', statusCode: 403 },
  USER_DUPLICATE_EMAIL: { code: 'USR-001', message: 'A user with this email already exists.', statusCode: 409 },
  USER_INVALID_ROLE: { code: 'USR-002', message: 'Role must be a canonical PeoplePay360 role.', statusCode: 400 },
  USER_INVALID_PASSWORD: { code: 'USR-003', message: 'Password does not meet the password policy.', statusCode: 400 },
  USER_PASSWORD_FORBIDDEN: { code: 'USR-004', message: 'Existing passwords cannot be retrieved.', statusCode: 403 },
  USER_DUPLICATE_BOOTSTRAP: { code: 'USR-005', message: 'A bootstrap Admin already exists.', statusCode: 409 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', statusCode: 400 },
  RESOURCE_NOT_FOUND: { code: 'RESOURCE_NOT_FOUND', message: 'Resource not found.', statusCode: 404 },
});
