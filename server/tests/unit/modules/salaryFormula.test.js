'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateRules, evaluateFormula, validateDependencies } = require('../../../src/modules/salaryConfig/formula.service');
const { ruleInput } = require('../../../src/modules/salaryConfig/salaryConfig.validation');
const structureId = 'a'.repeat(24);
const fixed = (code, sequence, fixedAmount = 2000) => ({ code, sequence, category: 'ALLOWANCE', calculationType: 'FIXED', fixedAmount, active: true });
const percent = (code, sequence, percentageBase, percentage = 20) => ({ code, sequence, category: 'ALLOWANCE', calculationType: 'PERCENTAGE', percentageBase, percentage, active: true });
const formula = (code, sequence, expression) => ({ code, sequence, category: 'GROSS', calculationType: 'FORMULA', formula: expression, active: true });
const throwsCode = (work, code) => assert.throws(work, error => error.code === code);

test('executes fixed, wage percentage, previous-component percentage and formula in ascending sequence', () => {
  const rules = [formula('GROSS', 40, 'BASIC + HRA + TRAVEL'), fixed('TRAVEL', 30), percent('HRA', 20, 'BASIC'), percent('BASIC', 10, 'CONTRACT_WAGE', 100)];
  const result = calculateRules(rules, { CONTRACT_WAGE: 10000 });
  assert.deepEqual(result.map(({ code, amount }) => ({ code, amount })), [
    { code: 'BASIC', amount: 10000 }, { code: 'HRA', amount: 2000 }, { code: 'TRAVEL', amount: 2000 }, { code: 'GROSS', amount: 14000 },
  ]);
});

test('supports precedence, parentheses, decimal and unary arithmetic', () => {
  assert.equal(evaluateFormula('-(2 + 3) * -2 + .5 / 2', {}), 10.25);
  assert.equal(evaluateFormula('8 / 4 / 2', {}), 1);
  assert.equal(evaluateFormula('2 * --3 - +1', {}), 5);
});

for (const expression of ['process.exit()', 'globalThis.process', 'require("fs")', 'BASIC.constructor', 'Math.max(1, 2)', '1; 2', '`id`', '$(id)', '1 ** 2', 'BASIC[0]', '(() => 1)()', '1 // 2', '2(3)', '2 3', '(1', '1)', '', '()']) {
  test(`rejects executable or malformed expression: ${expression}`, () => throwsCode(() => evaluateFormula(expression, { BASIC: 1 }), 'SAL-007'));
}

test('missing dependency uses SAL-003', () => throwsCode(() => validateDependencies([percent('HRA', 20, 'BASIC')]), 'SAL-003'));
test('later dependency uses SAL-004', () => throwsCode(() => validateDependencies([fixed('BASIC', 30), percent('HRA', 20, 'BASIC')]), 'SAL-004'));
test('equal sequence cannot be a dependency', () => throwsCode(() => validateDependencies([fixed('BASIC', 20), percent('HRA', 20, 'BASIC')]), 'SAL-004'));
test('circular dependencies use SAL-005', () => throwsCode(() => validateDependencies([percent('A', 10, 'B'), percent('B', 20, 'A')]), 'SAL-005'));
test('self dependency is circular', () => throwsCode(() => validateDependencies([formula('A', 10, 'A + 1')]), 'SAL-005'));
test('duplicate code uses SAL-001', () => throwsCode(() => validateDependencies([fixed('A', 10), fixed('A', 20)]), 'SAL-001'));
test('inactive rule cannot satisfy active dependency', () => throwsCode(() => validateDependencies([{ ...fixed('A', 10), active: false }, percent('B', 20, 'A')]), 'SAL-003'));
test('only active rules calculate', () => assert.equal(calculateRules([fixed('A', 10), { ...fixed('B', 20), active: false }], {}).length, 1));
test('structure without active rules is blocking', () => throwsCode(() => calculateRules([], {}), 'STR-004'));
test('caller context cannot supply a missing rule', () => throwsCode(() => calculateRules([percent('HRA', 20, 'BASIC')], { BASIC: 100 }), 'SAL-003'));
test('prototype values are not formula inputs', () => throwsCode(() => evaluateFormula('BASIC', Object.create({ BASIC: 100 })), 'SAL-003'));
for (const expression of ['1 / 0', '0 / 0', '1 / (2 - 2)']) {
  test(`invalid numeric output: ${expression}`, () => throwsCode(() => evaluateFormula(expression, {}), 'SAL-008'));
}
test('invalid component number is rejected', () => throwsCode(() => evaluateFormula('BASIC + 1', { BASIC: '1' }), 'SAL-008'));
test('invalid fixed numeric result is rejected', () => throwsCode(() => calculateRules([fixed('A', 10, Infinity)], {}), 'SAL-008'));
test('negative fixed amount is rejected', () => throwsCode(() => calculateRules([fixed('A', 10, -1)], {}), 'SAL-009'));
for (const calculationType of ['DERIVED_FORMULA', 'CONTRACT_WAGE', 'javascript']) {
  test(`invalid calculation type error ID: ${calculationType}`, () => {
    const { active, ...input } = fixed('A', 10);
    assert.equal(active, true);
    throwsCode(() => ruleInput({ ...input, salaryStructureId: structureId, name: 'A', calculationType }), 'SAL-006');
  });
}
test('rule input rejects contribution category', () => {
  throwsCode(() => ruleInput({ salaryStructureId: structureId, name: 'A', code: 'A', category: 'CONTRIBUTION', sequence: 1, calculationType: 'FIXED', fixedAmount: 2 }), 'VALIDATION_ERROR');
});
