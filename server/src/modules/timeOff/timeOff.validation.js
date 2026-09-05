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
