'use strict';

const mongoose = require('mongoose');
const AppError = require('../../core/errors/AppError');

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const fail = (code, field, message) => {
  throw new AppError(code, message, 400, 'ERROR', { field });
};
const object = (value, field = 'body') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('VALIDATION_ERROR', field, `${field} must be an object.`);
};
const allowed = (value, fields) => {
  const unknown = Object.keys(value).find(key => !fields.includes(key));
  if (unknown) fail('VALIDATION_ERROR', unknown, 'Unexpected request field.');
};
const name = value => {
  if (typeof value !== 'string' || !value.trim()) fail('VALIDATION_ERROR', 'name', 'name is required.');
  return value.trim();
};
const positiveInteger = (value, fallback, field, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > max) fail('VALIDATION_ERROR', field, `Invalid ${field}.`);
  return Number(value);
};

function time(value, field) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    fail('SCH-001', field, `${field} must use HH:mm.`);
  }
  return value;
}

function validateWorkingDays(value) {
  if (!Array.isArray(value) || !value.length) fail('SCH-004', 'workingDays', 'workingDays must contain at least one schedule line.');
  const seen = new Set();
  return value.map((line, index) => {
    const field = `workingDays.${index}`;
    object(line, field);
    allowed(line, ['day', 'isWorkingDay', 'startTime', 'endTime', 'breakMinutes']);
    if (!DAYS.includes(line.day) || seen.has(line.day)) fail('SCH-004', `${field}.day`, 'Schedule days must be valid and unique.');
    seen.add(line.day);
    if (typeof line.isWorkingDay !== 'boolean') fail('SCH-004', `${field}.isWorkingDay`, 'isWorkingDay must be boolean.');
    if (!line.isWorkingDay) {
      if (line.startTime != null || line.endTime != null || ![undefined, 0].includes(line.breakMinutes)) {
        fail('SCH-004', field, 'Non-working days cannot define working times or a break.');
      }
      return { day: line.day, isWorkingDay: false, startTime: null, endTime: null, breakMinutes: 0 };
    }
    const breakMinutes = line.breakMinutes;
    if (typeof breakMinutes !== 'number' || !Number.isFinite(breakMinutes) || breakMinutes < 0) {
      fail('SCH-002', `${field}.breakMinutes`, 'breakMinutes must be a non-negative number.');
    }
    return {
      day: line.day,
      isWorkingDay: true,
      startTime: time(line.startTime, `${field}.startTime`),
      endTime: time(line.endTime, `${field}.endTime`),
      breakMinutes,
    };
  });
}

function validateId({ params }) {
  if (!mongoose.isObjectIdOrHexString(params.id)) fail('VALIDATION_ERROR', 'id', 'id must be a valid identifier.');
  return { params: { id: params.id } };
}

function validateList({ query }) {
  allowed(query, ['q', 'active', 'page', 'limit']);
  let active;
  if (query.active !== undefined) {
    if (!['true', 'false'].includes(query.active)) fail('VALIDATION_ERROR', 'active', 'active must be true or false.');
    active = query.active === 'true';
  }
  let q;
  if (query.q !== undefined) {
    if (typeof query.q !== 'string' || !query.q.trim()) fail('VALIDATION_ERROR', 'q', 'q cannot be empty.');
    q = query.q.trim();
  }
  return { query: { q, active, page: positiveInteger(query.page, 1, 'page'), limit: positiveInteger(query.limit, 20, 'limit', 100) } };
}

function validateCreate({ body }) {
  object(body);
  allowed(body, ['name', 'workingDays']);
  return { body: { name: name(body.name), workingDays: validateWorkingDays(body.workingDays) } };
}

function validateUpdate({ body, params }) {
  validateId({ params });
  object(body);
  allowed(body, ['name', 'workingDays']);
  if (!Object.keys(body).length) fail('VALIDATION_ERROR', 'body', 'Provide at least one field.');
  return { params: { id: params.id }, body: {
    ...(body.name !== undefined ? { name: name(body.name) } : {}),
    ...(body.workingDays !== undefined ? { workingDays: validateWorkingDays(body.workingDays) } : {}),
  } };
}

module.exports = { DAYS, validateWorkingDays, validateId, validateList, validateCreate, validateUpdate };
