'use strict';

const AppError = require('../errors/AppError');

function invalid(message, code = 'VALIDATION_ERROR') {
  throw new AppError(code, message, 400);
}

function object(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Expected an object.');
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) invalid(`Unsupported field: ${key}.`);
  }
}

function text(value, field, code, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    invalid(`${field} must be a nonempty string of at most ${max} characters.`, code);
  }
  return value.trim();
}

function identifier(value, field = 'code') {
  const result = text(value, field);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(result)) invalid(`${field} must be an arithmetic identifier using letters, digits and underscores.`);
  return result;
}

function id(value) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) invalid('Invalid resource ID.');
  return value;
}

function boolean(value, field) {
  if (typeof value !== 'boolean') invalid(`${field} must be a boolean.`);
  return value;
}

function choice(value, choices, field, code) {
  if (!choices.includes(value)) invalid(`Invalid ${field}.`, code);
  return value;
}

function number(value, field, code = 'SAL-008') {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(`${field} must be a finite number.`, code);
  return value;
}

function query(value, extra = []) {
  object(value, ['page', 'limit', ...extra]);
  const result = {};
  for (const [key, fallback, max] of [['page', 1, Number.MAX_SAFE_INTEGER], ['limit', 20, 100]]) {
    const raw = value[key] ?? String(fallback);
    if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw) || Number(raw) > max) invalid(`Invalid ${key}.`);
    result[key] = Number(raw);
  }
  if (!Number.isSafeInteger((result.page - 1) * result.limit)) invalid('Page is too large.');
  for (const key of extra) {
    if (value[key] === undefined) continue;
    if (['active', 'requiresAllocation'].includes(key)) {
      if (!['true', 'false'].includes(value[key])) invalid(`Invalid ${key}.`);
      result[key] = value[key] === 'true';
    } else result[key] = text(value[key], key);
  }
  return result;
}

const search = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

module.exports = { invalid, object, text, identifier, id, boolean, choice, number, query, search };
