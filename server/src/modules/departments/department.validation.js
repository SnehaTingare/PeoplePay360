'use strict';

const mongoose = require('mongoose');
const AppError = require('../../core/errors/AppError');
const errors = require('../../core/errors/errorCodes');

const fail = (field, message = errors.VALIDATION_ERROR.message) => {
  throw new AppError(errors.VALIDATION_ERROR.code, message, errors.VALIDATION_ERROR.statusCode, 'ERROR', { field });
};
const object = body => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('body');
};
const allowed = (value, fields) => {
  const unknown = Object.keys(value).find(key => !fields.includes(key));
  if (unknown) fail(unknown, 'Unexpected request field.');
};
const requiredText = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) fail(field, `${field} is required.`);
  return value.trim();
};
const description = value => {
  if (typeof value !== 'string' || value.length > 2000) fail('description', 'description must be a string of at most 2000 characters.');
  return value.trim();
};
const code = value => {
  const normalized = requiredText(value, 'code').toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(normalized)) fail('code', 'code must contain uppercase letters, digits, or underscores.');
  return normalized;
};
const managerId = value => {
  if (value === null) return null;
  if (typeof value !== 'string' || !mongoose.isObjectIdOrHexString(value)) fail('managerId', 'managerId must be a valid identifier or null.');
  return value;
};
const positiveInteger = (value, fallback, field, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > max) fail(field);
  return Number(value);
};

function validateId({ params }) {
  if (!mongoose.isObjectIdOrHexString(params.id)) fail('id', 'id must be a valid identifier.');
  return { params: { id: params.id } };
}

function validateList({ query }) {
  allowed(query, ['q', 'active', 'page', 'limit']);
  let active;
  if (query.active !== undefined) {
    if (!['true', 'false'].includes(query.active)) fail('active', 'active must be true or false.');
    active = query.active === 'true';
  }
  let q;
  if (query.q !== undefined) {
    if (typeof query.q !== 'string' || !query.q.trim()) fail('q');
    q = query.q.trim();
  }
  return { query: {
    q, active,
    page: positiveInteger(query.page, 1, 'page'),
    limit: positiveInteger(query.limit, 20, 'limit', 100),
  } };
}

function validateCreate({ body }) {
  object(body);
  allowed(body, ['name', 'code', 'description', 'managerId']);
  return { body: {
    name: requiredText(body.name, 'name'),
    code: code(body.code),
    ...(body.description !== undefined ? { description: description(body.description) } : {}),
    ...(body.managerId !== undefined ? { managerId: managerId(body.managerId) } : {}),
  } };
}

function validateUpdate({ body, params }) {
  validateId({ params });
  object(body);
  allowed(body, ['name', 'code', 'description', 'managerId']);
  if (!Object.keys(body).length) fail('body', 'Provide at least one field.');
  const result = {};
  if (body.name !== undefined) result.name = requiredText(body.name, 'name');
  if (body.code !== undefined) result.code = code(body.code);
  if (body.description !== undefined) result.description = description(body.description);
  if (body.managerId !== undefined) result.managerId = managerId(body.managerId);
  return { params: { id: params.id }, body: result };
}

module.exports = { validateId, validateList, validateCreate, validateUpdate };
