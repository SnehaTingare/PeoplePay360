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
  if (typeof value !== 'string' || !value.trim()) fail(errors.VALIDATION_ERROR, field, `${field} is required.`);
  return value.trim();
}
function email(value) {
  if (typeof value !== 'string' || !EMAIL_PATTERN.test(value.trim())) {
    fail(errors.VALIDATION_ERROR, 'email', 'A valid email is required.');
  }
  return value.trim().toLowerCase();
}
function employeeId(value) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string' || !mongoose.isObjectIdOrHexString(value)) {
    fail(errors.VALIDATION_ERROR, 'employeeId', 'employeeId must be a valid identifier.');
  }
  return value;
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
  allowed(body, ['firstName', 'lastName', 'email', 'role', 'employeeId']);
  if (!canonicalRole(body.role)) fail(errors.USER_INVALID_ROLE, 'role');
  return { body: {
    firstName: name(body.firstName, 'firstName'), lastName: name(body.lastName, 'lastName'),
    email: email(body.email), role: body.role, employeeId: employeeId(body.employeeId),
  } };
}

function validateUpdateUser({ body, params }) {
  validateUserId({ params });
  object(body);
  allowed(body, ['firstName', 'lastName', 'email', 'employeeId']);
  if (!Object.keys(body).length) fail(errors.VALIDATION_ERROR, 'body');
  const result = {};
  if (body.firstName !== undefined) result.firstName = name(body.firstName, 'firstName');
  if (body.lastName !== undefined) result.lastName = name(body.lastName, 'lastName');
  if (body.email !== undefined) result.email = email(body.email);
  if (body.employeeId !== undefined) result.employeeId = employeeId(body.employeeId);
  return { params: { id: params.id }, body: result };
}

function validateChangeRole({ body, params }) {
  validateUserId({ params });
  object(body);
  allowed(body, ['role']);
  if (!canonicalRole(body.role)) fail(errors.USER_INVALID_ROLE, 'role');
  return { params: { id: params.id }, body: { role: body.role } };
}

module.exports = { validateUserId, validateListUsers, validateCreateUser, validateUpdateUser, validateChangeRole };
