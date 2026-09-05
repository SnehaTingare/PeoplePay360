'use strict';

const mongoose = require('mongoose');
const roles = require('../../core/constants/roles');
const { ACCOUNT_STATUS_VALUES } = require('../../core/constants/statuses');
const AppError = require('../../core/errors/AppError');
const errors = require('../../core/errors/errorCodes');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fail = (definition, field, message = definition.message) => {
  throw new AppError(definition.code, message, definition.statusCode, 'ERROR', { field });
};
const canonicalRole = role => Object.values(roles).includes(role);

function object(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(errors.VALIDATION_ERROR, 'body');
}
function allowed(value, fields) {
  const unknown = Object.keys(value).find(key => !fields.includes(key));
  if (unknown) fail(errors.VALIDATION_ERROR, unknown, 'Unexpected request field.');
}
function name(value, field) {
  if (typeof value !== 'string') {
    fail(errors.VALIDATION_ERROR, field, `${field} is required.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    fail(errors.VALIDATION_ERROR, field, `${field} is required.`);
  }

  if (normalized.length > 80) {
    fail(errors.VALIDATION_ERROR, field, `${field} must be at most 80 characters.`);
  }

  if (!/^[\p{L}][\p{L}\s'-]*$/u.test(normalized)) {
    fail(errors.VALIDATION_ERROR, field, `${field} contains invalid characters.`);
  }

  return normalized;
}
function email(value) {
  if (typeof value !== 'string') {
    fail(errors.VALIDATION_ERROR, 'email', 'A valid email is required.');
  }

  const normalized = value.trim().toLowerCase();

  if (
    !normalized ||
    normalized.length > 254 ||
    !EMAIL_PATTERN.test(normalized)
  ) {
    fail(errors.VALIDATION_ERROR, 'email', 'A valid email is required.');
  }

  return normalized;
}
function positiveInteger(value, fallback, field, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > max) {
    fail(errors.VALIDATION_ERROR, field);
  }
  return Number(value);
}

function validateUserId({ params }) {
  if (!mongoose.isObjectIdOrHexString(params.id)) fail(errors.VALIDATION_ERROR, 'id', 'id must be a valid identifier.');
  return { params: { id: params.id } };
}

function validateListUsers({ query }) {
  allowed(query, ['role', 'accountStatus', 'q', 'page', 'limit']);
  if (query.role !== undefined && !canonicalRole(query.role)) fail(errors.VALIDATION_ERROR, 'role');
  if (query.accountStatus !== undefined && !ACCOUNT_STATUS_VALUES.includes(query.accountStatus)) {
    fail(errors.VALIDATION_ERROR, 'accountStatus');
  }
  const page = positiveInteger(query.page, 1, 'page');
  const limit = positiveInteger(query.limit, 20, 'limit', 100);
  const q = typeof query.q === 'string' ? query.q.trim() : undefined;
  if (query.q !== undefined && !q) fail(errors.VALIDATION_ERROR, 'q');
  return { query: { role: query.role, accountStatus: query.accountStatus, q, page, limit } };
}

function validateCreateUser({ body }) {
  object(body);
  allowed(body, ['firstName', 'lastName', 'email', 'role']);
  if (!canonicalRole(body.role)) fail(errors.USER_INVALID_ROLE, 'role');
  if (body.role === roles.EMPLOYEE) fail(errors.USER_EMPLOYEE_REQUIRES_ONBOARDING, 'role');
  return { body: {
    firstName: name(body.firstName, 'firstName'), lastName: name(body.lastName, 'lastName'),
    email: email(body.email), role: body.role,
  } };
}

function validateUpdateUser({ body, params }) {
  validateUserId({ params });
  object(body);
  allowed(body, ['firstName', 'lastName', 'email']);
  if (!Object.keys(body).length) fail(errors.VALIDATION_ERROR, 'body');
  const result = {};
  if (body.firstName !== undefined) result.firstName = name(body.firstName, 'firstName');
  if (body.lastName !== undefined) result.lastName = name(body.lastName, 'lastName');
  if (body.email !== undefined) result.email = email(body.email);
  return { params: { id: params.id }, body: result };
}

function validateChangeRole({ body, params }) {
  validateUserId({ params });
  object(body);
  allowed(body, ['role']);
  if (!canonicalRole(body.role)) fail(errors.USER_INVALID_ROLE, 'role');
  if (body.role === roles.EMPLOYEE) fail(errors.USER_EMPLOYEE_REQUIRES_ONBOARDING, 'role');
  return { params: { id: params.id }, body: { role: body.role } };
}

module.exports = { validateUserId, validateListUsers, validateCreateUser, validateUpdateUser, validateChangeRole };
