'use strict';

const mongoose = require('mongoose');
const AppError = require('../../core/errors/AppError');

const CREATE_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'departmentId', 'jobPosition',
  'managerId', 'employeeType', 'workingScheduleId', 'joiningDate', 'bankDetails',
];
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
const text = (value, field, code = 'VALIDATION_ERROR', max = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(code, field, `${field} is required and must be at most ${max} characters.`);
  return value.trim();
};
const reference = (value, field, optional = false) => {
  if (optional && value === null) return null;
  if (typeof value !== 'string' || !mongoose.isObjectIdOrHexString(value)) fail('VALIDATION_ERROR', field, `${field} must be a valid identifier.`);
  return value;
};
const email = value => {
  const normalized = text(value, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) fail('VALIDATION_ERROR', 'email', 'A valid email is required.');
  return normalized;
};
const dateOnly = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('VALIDATION_ERROR', 'joiningDate', 'joiningDate must use YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('VALIDATION_ERROR', 'joiningDate', 'Invalid joiningDate.');
  return date;
};
const employeeType = value => {
  const normalized = text(value, 'employeeType').toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(normalized)) fail('VALIDATION_ERROR', 'employeeType', 'Invalid employeeType.');
  return normalized;
};
const bankDetails = value => {
  if (value === null) return null;
  object(value, 'bankDetails');
  allowed(value, ['accountHolderName', 'accountNumber', 'bankName', 'ifscCode']);
  return {
    accountHolderName: text(value.accountHolderName, 'bankDetails.accountHolderName'),
    accountNumber: text(value.accountNumber, 'bankDetails.accountNumber'),
    bankName: text(value.bankName, 'bankDetails.bankName'),
    ifscCode: text(value.ifscCode, 'bankDetails.ifscCode').toUpperCase(),
  };
};
const positiveInteger = (value, fallback, field, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > max) fail('VALIDATION_ERROR', field, `Invalid ${field}.`);
  return Number(value);
};

function validateId({ params }) {
  if (!mongoose.isObjectIdOrHexString(params.id)) fail('VALIDATION_ERROR', 'id', 'id must be a valid identifier.');
  return { params: { id: params.id } };
}

function validateList({ query }) {
  allowed(query, ['q', 'departmentId', 'employeeType', 'employmentStatus', 'managerId', 'page', 'limit']);
  const result = {
    page: positiveInteger(query.page, 1, 'page'),
    limit: positiveInteger(query.limit, 20, 'limit', 100),
  };
  if (query.q !== undefined) result.q = text(query.q, 'q');
  for (const field of ['departmentId', 'managerId']) if (query[field] !== undefined) result[field] = reference(query[field], field);
  if (query.employeeType !== undefined) result.employeeType = employeeType(query.employeeType);
  if (query.employmentStatus !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(query.employmentStatus)) fail('VALIDATION_ERROR', 'employmentStatus', 'Invalid employmentStatus.');
    result.employmentStatus = query.employmentStatus;
  }
  return { query: result };
}

function values(body, partial) {
  object(body);
  allowed(body, CREATE_FIELDS);
  if (partial && !Object.keys(body).length) fail('VALIDATION_ERROR', 'body', 'Provide at least one field.');
  if (!partial && (!body.departmentId || !body.jobPosition)) {
    fail('EMP-003', !body.departmentId ? 'departmentId' : 'jobPosition', 'Department and jobPosition are required.');
  }
  const result = {};
  for (const field of ['firstName', 'lastName', 'phone', 'jobPosition']) {
    if (!partial || body[field] !== undefined) result[field] = text(body[field], field, field === 'jobPosition' ? 'EMP-003' : 'VALIDATION_ERROR');
  }
  if (!partial || body.email !== undefined) result.email = email(body.email);
  if (!partial || body.departmentId !== undefined) result.departmentId = reference(body.departmentId, 'departmentId');
  if (!partial || body.employeeType !== undefined) result.employeeType = employeeType(body.employeeType);
  if (!partial || body.workingScheduleId !== undefined) result.workingScheduleId = reference(body.workingScheduleId, 'workingScheduleId');
  if (!partial || body.joiningDate !== undefined) result.joiningDate = dateOnly(body.joiningDate);
  if (body.managerId !== undefined) result.managerId = reference(body.managerId, 'managerId', true);
  if (body.bankDetails !== undefined) result.bankDetails = bankDetails(body.bankDetails);
  return result;
}

const validateCreate = ({ body }) => ({ body: values(body, false) });
function validateUpdate({ body, params }) {
  validateId({ params });
  return { params: { id: params.id }, body: values(body, true) };
}

module.exports = { validateId, validateList, validateCreate, validateUpdate };
