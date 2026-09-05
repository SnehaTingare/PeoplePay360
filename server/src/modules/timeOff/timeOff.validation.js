'use strict';

const v = require('../../core/http/validation');
const fields = ['name', 'code', 'description', 'unit', 'requiresAllocation', 'requiresApproval', 'isPaid', 'payrollTreatment'];

function typeInput(body, partial = false) {
  v.object(body, fields);
  if (partial && !Object.keys(body).length) v.invalid('Provide at least one field.');
  const result = {};
  for (const key of ['name', 'code']) {
    if (!partial || key in body) result[key] = v.text(body[key], key);
  }
  if ('description' in body) {
    if (typeof body.description !== 'string' || body.description.length > 2000) v.invalid('Invalid description.');
    result.description = body.description;
  }
  for (const key of ['requiresAllocation', 'requiresApproval', 'isPaid']) {
    if (!partial || key in body) result[key] = v.boolean(body[key], key);
  }
  if (!partial || 'unit' in body) result.unit = v.choice(body.unit, ['DAYS', 'HOURS'], 'unit');
  if (!partial || 'payrollTreatment' in body) result.payrollTreatment = v.choice(body.payrollTreatment, ['NONE', 'PAID', 'UNPAID_DEDUCTION'], 'payrollTreatment');
  return result;
}

function listQuery(query) {
  const result = v.query(query, ['active', 'unit', 'requiresAllocation', 'q']);
  if (result.unit) v.choice(result.unit, ['DAYS', 'HOURS'], 'unit');
  return result;
}

module.exports = { typeInput, listQuery, id: v.id };

const dates = require('../../core/http/dates');
function allocationInput(body, partial = false) {
  v.object(body, ['employeeId', 'timeOffTypeId', 'allocatedAmount', 'validFrom', 'validUntil']);
  if (partial && !Object.keys(body).length) v.invalid('Provide at least one field.');
  const result = {};
  for (const key of ['employeeId', 'timeOffTypeId']) if (!partial || key in body) result[key] = v.id(body[key]);
  if (!partial || 'allocatedAmount' in body) {
    result.allocatedAmount = v.number(body.allocatedAmount, 'allocatedAmount', 'LEV-009');
    if (result.allocatedAmount < 0) v.invalid('Allocation amount cannot be negative.', 'LEV-009');
  }
  if (!partial || 'validFrom' in body) result.validFrom = dates.dateOnly(body.validFrom, 'validFrom');
  if (!partial || 'validUntil' in body) result.validUntil = new Date(dates.dateOnly(body.validUntil, 'validUntil').getTime() + dates.DAY - 1);
  if (result.validFrom && result.validUntil) dates.range(result.validFrom, result.validUntil, 'LEV-001');
  return result;
}
function requestInput(body, employee = false) {
  v.object(body, ['timeOffTypeId', 'startDate', 'endDate', 'reason', ...(employee ? [] : ['employeeId'])]);
  const result = { timeOffTypeId: v.id(body.timeOffTypeId), reason: v.text(body.reason, 'reason', undefined, 2000) };
  if (!employee) result.employeeId = v.id(body.employeeId);
  const calendar = typeof body.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate);
  if (calendar) {
    result.startDate = dates.dateOnly(body.startDate, 'startDate');
    result.endDate = new Date(dates.dateOnly(body.endDate, 'endDate').getTime() + dates.DAY - 1);
  } else {
    result.startDate = dates.timestamp(body.startDate, 'startDate');
    result.endDate = dates.timestamp(body.endDate, 'endDate');
  }
  dates.range(result.startDate, result.endDate, 'LEV-001');
  if (result.startDate.getTime() === result.endDate.getTime()) v.invalid('Leave must have positive duration.', 'LEV-001');
  return result;
}
function leaveQuery(query, allocation = false, own = false) {
  const extra = allocation ? ['timeOffTypeId', 'status', ...(own ? [] : ['employeeId', 'validOn'])] : ['status', 'from', 'to', ...(own ? [] : ['employeeId', 'timeOffTypeId'])];
  const result = v.query(query, extra);
  for (const key of ['employeeId', 'timeOffTypeId']) if (result[key]) v.id(result[key]);
  if (result.status) v.choice(result.status, allocation ? ['DRAFT', 'APPROVED', 'CANCELLED'] : ['PENDING', 'APPROVED', 'REFUSED'], 'status');
  for (const key of ['validOn', 'from', 'to']) if (result[key]) result[key] = dates.dateOnly(result[key], key);
  if (result.from && result.to) dates.range(result.from, result.to, 'LEV-001');
  return result;
}
function decisionInput(body = {}) {
  v.object(body, ['comment']);
  return body.comment === undefined ? '' : v.text(body.comment, 'comment', undefined, 2000);
}
Object.assign(module.exports, { allocationInput, requestInput, leaveQuery, decisionInput });
