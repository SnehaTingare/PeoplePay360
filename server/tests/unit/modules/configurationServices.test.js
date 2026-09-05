'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const createStore = require('../../fixtures/configurationStore');
const { createTimeOffService } = require('../../../src/modules/timeOff/timeOff.service');
const { createSalaryConfigService } = require('../../../src/modules/salaryConfig/salaryConfig.service');
const TypeModel = require('../../../src/modules/timeOff/timeOffType.model');
const StructureModel = require('../../../src/modules/salaryConfig/salaryStructure.model');
const RuleModel = require('../../../src/modules/salaryConfig/salaryRule.model');
const policy = { name: 'Casual Leave', code: 'CL', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, isPaid: true, payrollTreatment: 'PAID' };
const rejectsCode = (work, code) => assert.rejects(work, error => error.code === code);

function setup(references) {
  const store = createStore();
  const Structure = store.model(['code']);
  const Rule = store.model(['salaryStructure', 'code']);
  return { ...createSalaryConfigService({ Structure, Rule, transaction: store.transaction, references }), Structure, Rule };
}
const fixed = (salaryStructureId, code = 'BASIC', sequence = 10) => ({ salaryStructureId, name: code, code, category: 'BASIC', sequence, calculationType: 'FIXED', fixedAmount: 1000 });

test('database schemas declare the correct unique indexes', () => {
  assert.ok(TypeModel.schema.indexes().some(([keys, options]) => keys.code === 1 && options.unique));
  assert.ok(StructureModel.schema.indexes().some(([keys, options]) => keys.code === 1 && options.unique));
  assert.ok(RuleModel.schema.indexes().some(([keys, options]) => keys.salaryStructure === 1 && keys.code === 1 && options.unique));
});

test('schemas reject invalid units and canonical calculation types', async () => {
  await assert.rejects(new TypeModel({ ...policy, unit: 'WEEKS' }).validate());
  await assert.rejects(new RuleModel({ ...fixed('a'.repeat(24)), salaryStructure: 'a'.repeat(24), calculationType: 'DERIVED_FORMULA' }).validate());
});

test('duplicate type codes rejected on create and update', async () => {
  const store = createStore();
  const service = createTimeOffService({ Type: store.model(['code']) });
  await service.createType(policy);
  await rejectsCode(() => service.createType(policy), 'DUPLICATE_CODE');
  const second = await service.createType({ ...policy, code: 'SL' });
  await rejectsCode(() => service.updateType(second._id, { code: 'CL' }), 'DUPLICATE_CODE');
});

test('employee type reads and future-use lookup exclude inactive records', async () => {
  const store = createStore();
  const service = createTimeOffService({ Type: store.model(['code']) });
  const type = await service.createType(policy);
  await service.deactivateType(type._id);
  assert.equal((await service.listTypes({ active: 'false' }, { activeOnly: true })).data.length, 0);
  assert.equal((await service.listTypes({})).data.length, 1);
  await rejectsCode(() => service.getActiveType(type._id), 'RESOURCE_NOT_FOUND');
});

test('type policy changes preserve history and require a connected check', async () => {
  const store = createStore();
  const Type = store.model(['code']);
  const service = createTimeOffService({ Type });
  const type = await service.createType(policy);
  await rejectsCode(() => service.updateType(type._id, { unit: 'HOURS' }), 'DEPENDENCY_UNAVAILABLE');
  const historical = createTimeOffService({ Type, hasTypeHistory: async () => true });
  await rejectsCode(() => historical.updateType(type._id, { unit: 'HOURS' }), 'RESOURCE_CONFLICT');
  const unused = createTimeOffService({ Type, hasTypeHistory: async () => false });
  assert.equal((await unused.updateType(type._id, { unit: 'HOURS' })).unit, 'HOURS');
});

test('type fields and payroll treatment are validated', async () => {
  const store = createStore();
  const service = createTimeOffService({ Type: store.model(['code']) });
  for (const body of [{ ...policy, isPaid: 'true' }, { ...policy, unit: 'WEEKS' }, { ...policy, isPaid: false }, { ...policy, name: '' }]) {
    await rejectsCode(() => service.createType(body), 'VALIDATION_ERROR');
  }
});

test('salary structure uniqueness on create and update', async () => {
  const service = setup();
  await service.createStructure({ name: 'Regular', code: 'REGULAR' });
  await rejectsCode(() => service.createStructure({ name: 'Other', code: 'REGULAR' }), 'STR-002');
  const other = await service.createStructure({ name: 'Other', code: 'OTHER' });
  await rejectsCode(() => service.updateStructure(other._id, { code: 'REGULAR' }), 'STR-002');
});

test('salary structure lifecycle and empty active rule blocking', async () => {
  const service = setup();
  const structure = await service.createStructure({ name: 'Regular', code: 'REGULAR' });
  await rejectsCode(() => service.getOrderedActiveRules(structure._id), 'STR-004');
  await service.deactivateStructure(structure._id);
  await rejectsCode(() => service.getOrderedActiveRules(structure._id), 'STR-003');
  await service.activateStructure(structure._id);
  assert.equal((await service.getStructure(structure._id)).active, true);
});

test('rule uniqueness is scoped to structure and unknown references are rejected', async () => {
  const service = setup();
  const a = await service.createStructure({ name: 'A', code: 'A' });
  const b = await service.createStructure({ name: 'B', code: 'B' });
  await service.createRule(fixed(a._id));
  await rejectsCode(() => service.createRule(fixed(a._id)), 'SAL-001');
  await service.createRule(fixed(b._id));
  await rejectsCode(() => service.createRule(fixed('f'.repeat(24))), 'RESOURCE_NOT_FOUND');
});

test('rule mutation validates the entire graph and rolls back failures', async () => {
  const service = setup({ hasRuleReferences: async () => false });
  const structure = await service.createStructure({ name: 'A', code: 'A' });
  const basic = await service.createRule(fixed(structure._id));
  const hra = await service.createRule({ salaryStructureId: structure._id, name: 'HRA', code: 'HRA', category: 'ALLOWANCE', sequence: 20, calculationType: 'PERCENTAGE', percentage: 20, percentageBase: 'BASIC' });
  await rejectsCode(() => service.updateRule(basic._id, { sequence: 30 }), 'SAL-004');
  await rejectsCode(() => service.updateRule(basic._id, { calculationType: 'FORMULA', formula: 'HRA' }), 'SAL-005');
  await rejectsCode(() => service.updateRule(basic._id, { code: 'NEW_BASIC' }), 'SAL-003');
  await rejectsCode(() => service.deactivateRule(basic._id), 'SAL-003');
  await rejectsCode(() => service.deleteRule(basic._id), 'SAL-003');
  assert.equal((await service.getRule(basic._id)).sequence, 10);
  await service.deactivateRule(hra._id);
  await service.deactivateRule(basic._id);
  await rejectsCode(() => service.activateRule(hra._id), 'SAL-003');
  await service.activateRule(basic._id);
  await service.activateRule(hra._id);
  assert.deepEqual((await service.getOrderedActiveRules(structure._id)).map(rule => rule.code), ['BASIC', 'HRA']);
});

test('switching calculation type clears old configuration', async () => {
  const service = setup();
  const structure = await service.createStructure({ name: 'A', code: 'A' });
  const rule = await service.createRule(fixed(structure._id));
  const updated = await service.updateRule(rule._id, { calculationType: 'FORMULA', formula: 'CONTRACT_WAGE / 2' });
  assert.equal(updated.fixedAmount, undefined);
  assert.equal(updated.formula, 'CONTRACT_WAGE / 2');
});

test('deletion requires history checks and only removes safe records', async () => {
  const service = setup();
  const structure = await service.createStructure({ name: 'A', code: 'A' });
  await rejectsCode(() => service.deleteStructure(structure._id), 'DEPENDENCY_UNAVAILABLE');
  const rule = await service.createRule(fixed(structure._id));
  await rejectsCode(() => service.deleteRule(rule._id), 'DEPENDENCY_UNAVAILABLE');
  const store = createStore();
  const history = createSalaryConfigService({ Structure: service.Structure, Rule: service.Rule, transaction: store.transaction,
    references: { hasStructureReferences: async () => true, hasRuleReferences: async () => true } });
  await rejectsCode(() => history.deleteStructure(structure._id), 'RESOURCE_CONFLICT');
  await rejectsCode(() => history.deleteRule(rule._id), 'RESOURCE_CONFLICT');
  const safe = createSalaryConfigService({ Structure: service.Structure, Rule: service.Rule, transaction: store.transaction,
    references: { hasStructureReferences: async () => false, hasRuleReferences: async () => false } });
  await rejectsCode(() => safe.deleteStructure(structure._id), 'RESOURCE_CONFLICT');
  await safe.deleteRule(rule._id);
  await safe.deleteStructure(structure._id);
  await rejectsCode(() => safe.getStructure(structure._id), 'RESOURCE_NOT_FOUND');
});

test('pagination, literal search and query types are validated', async () => {
  const service = setup();
  await service.createStructure({ name: 'A.*', code: 'A' });
  await service.createStructure({ name: 'B', code: 'B' });
  assert.equal((await service.listStructures({ q: '.*' })).meta.total, 1);
  assert.equal((await service.listStructures({ limit: '1', page: '2' })).data[0].code, 'B');
  for (const query of [{ active: { $ne: true } }, { page: '0' }, { limit: '101' }, { q: ['A'] }]) await rejectsCode(() => service.listStructures(query), 'VALIDATION_ERROR');
});

test('moving a rule cannot strand dependents in its original structure', async () => {
  const service = setup();
  const a = await service.createStructure({ name: 'A', code: 'A' });
  const b = await service.createStructure({ name: 'B', code: 'B' });
  const basic = await service.createRule(fixed(a._id));
  await service.createRule({ salaryStructureId: a._id, name: 'HRA', code: 'HRA', category: 'ALLOWANCE', sequence: 20, calculationType: 'FORMULA', formula: 'BASIC / 5' });
  await rejectsCode(() => service.updateRule(basic._id, { salaryStructureId: b._id }), 'SAL-003');
  assert.equal((await service.getRule(basic._id)).salaryStructure, a._id);
});

test('missing and malformed formulas are rejected before persistence', async () => {
  const service = setup();
  const structure = await service.createStructure({ name: 'A', code: 'A' });
  const input = { salaryStructureId: structure._id, name: 'Gross', code: 'GROSS', category: 'GROSS', sequence: 30, calculationType: 'FORMULA' };
  await rejectsCode(() => service.createRule({ ...input, formula: 'MISSING + 1' }), 'SAL-003');
  await rejectsCode(() => service.createRule({ ...input, formula: 'process.exit()' }), 'SAL-007');
  await rejectsCode(() => service.createRule(input), 'SAL-007');
  assert.equal(service.Rule.rows.size, 0);
});

test('indeterminate reference checks fail closed', async () => {
  const service = setup({ hasStructureReferences: async () => undefined });
  const structure = await service.createStructure({ name: 'A', code: 'A' });
  await rejectsCode(() => service.deleteStructure(structure._id), 'DEPENDENCY_UNAVAILABLE');
  assert.equal((await service.getStructure(structure._id)).code, 'A');
});
