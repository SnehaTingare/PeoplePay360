'use strict';

const { invalid } = require('./validation');
const DAY = 86400000;

function dateOnly(value, field = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid(`${field} must use YYYY-MM-DD.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) invalid(`Invalid ${field}.`);
  return date;
}

function timestamp(value, field = 'timestamp') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) invalid(`${field} must be an ISO timestamp with timezone.`);
  dateOnly(value.slice(0, 10), field);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) invalid(`Invalid ${field}.`);
  return date;
}

function range(start, end, code = 'VALIDATION_ERROR') {
  if (start > end) invalid('Start must not be after end.', code);
}

function filter(options, field, target) {
  if (options.from || options.to) {
    target[field] = {};
    if (options.from) target[field].$gte = options.from;
    if (options.to) target[field].$lt = new Date(options.to.getTime() + DAY);
  }
}

module.exports = { DAY, dateOnly, timestamp, range, filter };
