'use strict';

const v = require('../../core/http/validation');
const categories = ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET'];
const calculationTypes = ['FIXED', 'PERCENTAGE', 'FORMULA'];
const structureFields = ['name', 'code', 'description'];
const ruleFields = ['salaryStructureId', 'name', 'code', 'category', 'sequence', 'calculationType', 'fixedAmount', 'percentage', 'percentageBase', 'formula'];

function structureInput(body, partial = false) {
  v.object(body, structureFields);
  if (partial && !Object.keys(body).length) v.invalid('Provide at least one field.');
  const result = {};
  for (const key of ['name', 'code']) {
    if (!partial || key in body) result[key] = v.text(body[key], key, 'STR-001');
  }
  if ('description' in body) {
    if (typeof body.description !== 'string' || body.description.length > 2000) v.invalid('Invalid description.');
    result.description = body.description;
  }
  return result;
}

function ruleInput(body, partial = false) {
  v.object(body, ruleFields);
  if (partial && !Object.keys(body).length) v.invalid('Provide at least one field.');
  const result = {};
  if (!partial || 'salaryStructureId' in body) result.salaryStructureId = v.id(body.salaryStructureId);
  if (!partial || 'name' in body) result.name = v.text(body.name, 'name');
  if (!partial || 'code' in body) {
    result.code = v.identifier(body.code);
    if (result.code === 'CONTRACT_WAGE') v.invalid('CONTRACT_WAGE is reserved for payroll input.');
  }
  if (!partial || 'category' in body) result.category = v.choice(body.category, categories, 'category');
  if (!partial || 'sequence' in body) {
    if (!Number.isSafeInteger(body.sequence) || body.sequence < 0) v.invalid('Sequence must be a nonnegative integer.', 'SAL-002');
    result.sequence = body.sequence;
  }
  if (!partial || 'calculationType' in body) result.calculationType = v.choice(body.calculationType, calculationTypes, 'calculationType', 'SAL-006');
  for (const key of ['fixedAmount', 'percentage']) {
    if (key in body) {
      result[key] = v.number(body[key], key);
      if (result[key] < 0) v.invalid(`${key} cannot be negative.`, 'SAL-009');
    }
  }
  if ('percentageBase' in body) result.percentageBase = v.identifier(body.percentageBase, 'percentageBase');
  if ('formula' in body) result.formula = v.text(body.formula, 'formula', 'SAL-007', 2000);
  if (!partial) completeRule(result);
  return result;
}

function completeRule(rule) {
  v.choice(rule.calculationType, calculationTypes, 'calculationType', 'SAL-006');
  if (rule.calculationType === 'FIXED') v.number(rule.fixedAmount, 'fixedAmount');
  if (rule.calculationType === 'PERCENTAGE') {
    v.number(rule.percentage, 'percentage');
    v.identifier(rule.percentageBase, 'percentageBase');
  }
  if (rule.calculationType === 'FORMULA') v.text(rule.formula, 'formula', 'SAL-007', 2000);
  const relevant = { FIXED: ['fixedAmount'], PERCENTAGE: ['percentage', 'percentageBase'], FORMULA: ['formula'] }[rule.calculationType];
  for (const key of ['fixedAmount', 'percentage', 'percentageBase', 'formula']) {
    if (!relevant.includes(key) && rule[key] !== undefined) v.invalid(`${key} does not apply to ${rule.calculationType}.`);
  }
}

function listStructures(query) { return v.query(query, ['active', 'q']); }
function listRules(query) {
  const result = v.query(query, ['salaryStructureId', 'category', 'active']);
  if (result.salaryStructureId) v.id(result.salaryStructureId);
  if (result.category) v.choice(result.category, categories, 'category');
  return result;
}

module.exports = { structureInput, ruleInput, completeRule, listStructures, listRules, id: v.id };
