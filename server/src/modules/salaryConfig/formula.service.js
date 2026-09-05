'use strict';

const AppError = require('../../core/errors/AppError');
const fail = (code, message) => { throw new AppError(code, message, 422, code === 'SAL-008' || code === 'SAL-003' ? 'BLOCKING' : 'ERROR'); };
const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, 'u+': 3, 'u-': 3 };
const RUNTIME_INPUTS = new Set([
  'CONTRACT_WAGE', 'EXPECTED_WORKING_DAYS', 'EXPECTED_WORKING_MINUTES',
  'UNPAID_LEAVE_DAYS', 'UNPAID_LEAVE_HOURS', 'WORKED_DAYS', 'DAILY_RATE',
  'ATTENDANCE_WORKED_HOURS',
]);

// Shunting-yard parser: only numbers, identifiers, arithmetic and parentheses.
function parseFormula(expression) {
  if (typeof expression !== 'string' || !expression.trim() || expression.length > 2000) fail('SAL-007', 'Invalid arithmetic formula.');
  const output = [];
  const operators = [];
  const dependencies = new Set();
  let expectingValue = true;
  let offset = 0;
  while (offset < expression.length) {
    const rest = expression.slice(offset);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) { offset += whitespace[0].length; continue; }
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)|^[A-Za-z_][A-Za-z0-9_]*|^[+\-*/()]/.exec(rest);
    if (!match) fail('SAL-007', 'Only arithmetic expressions are allowed.');
    const token = match[0];
    offset += token.length;
    if (/^[A-Za-z_]/.test(token) || /^[\d.]/.test(token)) {
      if (!expectingValue) fail('SAL-007', 'Expected an arithmetic operator.');
      if (/^[A-Za-z_]/.test(token)) { output.push({ identifier: token }); dependencies.add(token); }
      else {
        const value = Number(token);
        if (!Number.isFinite(value)) fail('SAL-008', 'Formula contains an invalid number.');
        output.push({ value });
      }
      expectingValue = false;
    } else if (token === '(') {
      if (!expectingValue) fail('SAL-007', 'Function calls and implicit multiplication are not allowed.');
      operators.push(token);
    } else if (token === ')') {
      if (expectingValue) fail('SAL-007', 'Expected an arithmetic value.');
      while (operators.length && operators.at(-1) !== '(') output.push({ operator: operators.pop() });
      if (operators.pop() !== '(') fail('SAL-007', 'Unbalanced parentheses.');
    } else {
      if (expectingValue && !['+', '-'].includes(token)) fail('SAL-007', 'Expected an arithmetic value.');
      const operator = expectingValue ? `u${token}` : token;
      while (operators.length && operators.at(-1) !== '(' &&
        (precedence[operators.at(-1)] > precedence[operator] ||
         (!operator.startsWith('u') && precedence[operators.at(-1)] === precedence[operator]))) {
        output.push({ operator: operators.pop() });
      }
      operators.push(operator);
      expectingValue = true;
    }
  }
  if (expectingValue) fail('SAL-007', 'Incomplete arithmetic expression.');
  while (operators.length) {
    const operator = operators.pop();
    if (operator === '(') fail('SAL-007', 'Unbalanced parentheses.');
    output.push({ operator });
  }
  return { tokens: output, dependencies: [...dependencies] };
}

function evaluateFormula(expression, context) {
  const stack = [];
  for (const token of parseFormula(expression).tokens) {
    if ('value' in token) stack.push(token.value);
    else if (token.identifier) {
      if (!Object.hasOwn(context, token.identifier)) fail('SAL-003', `Missing component: ${token.identifier}.`);
      const value = context[token.identifier];
      if (typeof value !== 'number' || !Number.isFinite(value)) fail('SAL-008', 'Component must be a finite number.');
      stack.push(value);
    } else {
      const right = stack.pop();
      let value;
      if (token.operator === 'u-') value = -right;
      else if (token.operator === 'u+') value = right;
      else {
        const left = stack.pop();
        if (token.operator === '+') value = left + right;
        if (token.operator === '-') value = left - right;
        if (token.operator === '*') value = left * right;
        if (token.operator === '/') value = left / right;
      }
      if (!Number.isFinite(value)) fail('SAL-008', 'Formula produced an invalid numeric result.');
      stack.push(value);
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) fail('SAL-008', 'Invalid numeric result.');
  return stack[0];
}

function dependencies(rule) {
  if (rule.calculationType === 'FIXED') return [];
  if (rule.calculationType === 'PERCENTAGE') return [rule.percentageBase];
  if (rule.calculationType === 'FORMULA') return parseFormula(rule.formula).dependencies;
  fail('SAL-006', 'Invalid calculation type.');
}

function validateDependencies(rules) {
  const byCode = new Map();
  for (const rule of rules) {
    if (byCode.has(rule.code)) fail('SAL-001', 'Duplicate rule code in salary structure.');
    if (RUNTIME_INPUTS.has(rule.code)) fail('SAL-003', 'Rule code conflicts with payroll input.');
    if (!Number.isSafeInteger(rule.sequence) || rule.sequence < 0) fail('SAL-002', 'Invalid rule sequence.');
    byCode.set(rule.code, rule);
  }
  const graph = new Map();
  for (const rule of rules) {
    const refs = dependencies(rule).filter(code => !RUNTIME_INPUTS.has(code));
    for (const code of refs) {
      if (!byCode.has(code) || (rule.active !== false && byCode.get(code).active === false)) fail('SAL-003', `Missing active dependency: ${code}.`);
    }
    graph.set(rule.code, refs);
  }
  // Detect cycles before checking sequence so cycles have a stable SAL-005 error.
  const remaining = new Map([...graph].map(([code, refs]) => [code, refs.length]));
  const dependents = new Map([...graph.keys()].map(code => [code, []]));
  for (const [code, refs] of graph) for (const ref of refs) dependents.get(ref).push(code);
  const ready = [...remaining].filter(([, count]) => count === 0).map(([code]) => code);
  let visited = 0;
  while (ready.length) {
    const code = ready.pop();
    visited++;
    for (const dependent of dependents.get(code)) {
      remaining.set(dependent, remaining.get(dependent) - 1);
      if (remaining.get(dependent) === 0) ready.push(dependent);
    }
  }
  if (visited !== rules.length) fail('SAL-005', 'Circular salary rule dependency.');
  for (const rule of rules) {
    for (const code of graph.get(rule.code)) {
      if (byCode.get(code).sequence >= rule.sequence) fail('SAL-004', `Dependency ${code} must have an earlier sequence.`);
    }
  }
  return [...rules].sort((a, b) => a.sequence - b.sequence || a.code.localeCompare(b.code));
}

function calculateRules(rules, inputs, normalizeAmount = value => value) {
  const active = rules.filter(rule => rule.active !== false);
  if (!active.length) throw new AppError('STR-004', 'Salary structure has no active rules.', 422, 'BLOCKING');
  const ordered = validateDependencies(active);
  // Do not allow caller-supplied component values to bypass rule dependencies.
  const context = Object.create(null);
  for (const key of RUNTIME_INPUTS) {
    if (Object.hasOwn(inputs, key)) context[key] = inputs[key];
  }
  return ordered.map(rule => {
    let amount;
    if (rule.calculationType === 'FIXED') amount = rule.fixedAmount;
    else if (rule.calculationType === 'PERCENTAGE') {
      if (!Object.hasOwn(context, rule.percentageBase)) fail('SAL-003', `Missing component: ${rule.percentageBase}.`);
      if (typeof rule.percentage !== 'number' || typeof context[rule.percentageBase] !== 'number') fail('SAL-008', 'Invalid numeric component.');
      amount = context[rule.percentageBase] * rule.percentage / 100;
    } else amount = evaluateFormula(rule.formula, context);
    if (typeof amount !== 'number' || !Number.isFinite(amount)) fail('SAL-008', 'Rule produced an invalid numeric result.');
    if ((rule.calculationType === 'FIXED' && amount < 0) || (rule.calculationType === 'PERCENTAGE' && rule.percentage < 0)) fail('SAL-009', 'Configured amount or percentage cannot be negative.');
    amount = normalizeAmount(amount);
    if (typeof amount !== 'number' || !Number.isFinite(amount)) fail('SAL-008', 'Rule produced an invalid normalized result.');
    context[rule.code] = amount;
    return { code: rule.code, category: rule.category, sequence: rule.sequence, amount };
  });
}

module.exports = { RUNTIME_INPUTS, parseFormula, evaluateFormula, dependencies, validateDependencies, calculateRules };
