'use strict';

const mongoose = require('mongoose');
const AppError = require('../../core/errors/AppError');

const fail = (code, message, field, statusCode = 400) => { throw new AppError(code, message, statusCode, 'ERROR', { field }); };
function parseDate(value, field, endOfDay = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('RPT-002', `${field} must use YYYY-MM-DD.`, field);
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('RPT-002', `Invalid ${field}.`, field);
  return date;
}
function dashboard({ query }) {
  const allowed = ['from', 'to', 'departmentId', 'employeeType'];
  const unknown = Object.keys(query).find(key => !allowed.includes(key));
  if (unknown) fail('VALIDATION_ERROR', 'Unexpected query field.', unknown);
  const result = {};
  if (query.from) result.from = parseDate(query.from, 'from');
  if (query.to) result.to = parseDate(query.to, 'to', true);
  if (result.from && result.to && result.from > result.to) fail('RPT-002', 'Report start date must not be after end date.', 'from', 422);
  if (query.departmentId) {
    if (!mongoose.isObjectIdOrHexString(query.departmentId)) fail('RPT-003', 'Invalid Department filter.', 'departmentId');
    result.departmentId = query.departmentId;
  }
  if (query.employeeType) {
    if (typeof query.employeeType !== 'string' || !query.employeeType.trim() || query.employeeType.length > 50) fail('RPT-003', 'Invalid Employee Type filter.', 'employeeType');
    result.employeeType = query.employeeType.trim().toUpperCase();
  }
  return { query: result };
}

module.exports = { dashboard };
