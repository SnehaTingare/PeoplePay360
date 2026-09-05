'use strict';

require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const SalaryStructure = require('../src/modules/salaryConfig/salaryStructure.model');
const SalaryRule = require('../src/modules/salaryConfig/salaryRule.model');

const definitions = [
  {
    name: 'Monthly Salary',
    code: 'MONTHLY_STANDARD',
    description: 'Standard monthly payroll with basic salary, housing allowance, deductions, and net salary.',
    rules: [
      { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 10, calculationType: 'PERCENTAGE', percentage: 60, percentageBase: 'CONTRACT_WAGE' },
      { name: 'Housing Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 20, calculationType: 'PERCENTAGE', percentage: 20, percentageBase: 'BASIC' },
      { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 30, calculationType: 'FORMULA', formula: 'BASIC + HRA' },
      { name: 'Provident Fund', code: 'PF', category: 'DEDUCTION', sequence: 40, calculationType: 'PERCENTAGE', percentage: 12, percentageBase: 'BASIC' },
      { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 50, calculationType: 'FORMULA', formula: 'GROSS - PF' },
    ],
  },
  {
    name: 'Hourly Salary',
    code: 'HOURLY_BASIC',
    description: 'Simple hourly or part-time payroll structure using the contract wage as the basic amount.',
    rules: [
      { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 10, calculationType: 'PERCENTAGE', percentage: 100, percentageBase: 'CONTRACT_WAGE' },
      { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 20, calculationType: 'FORMULA', formula: 'BASIC' },
      { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 30, calculationType: 'FORMULA', formula: 'GROSS' },
    ],
  },
  {
    name: 'Executive Salary',
    code: 'EXECUTIVE_MONTHLY',
    description: 'Monthly executive payroll with housing and fixed transport allowance.',
    rules: [
      { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 10, calculationType: 'PERCENTAGE', percentage: 70, percentageBase: 'CONTRACT_WAGE' },
      { name: 'Housing Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 20, calculationType: 'PERCENTAGE', percentage: 20, percentageBase: 'BASIC' },
      { name: 'Transport Allowance', code: 'TRANSPORT', category: 'ALLOWANCE', sequence: 30, calculationType: 'FIXED', fixedAmount: 5000 },
      { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 40, calculationType: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT' },
      { name: 'Income Tax', code: 'TAX', category: 'DEDUCTION', sequence: 50, calculationType: 'PERCENTAGE', percentage: 10, percentageBase: 'GROSS' },
      { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 60, calculationType: 'FORMULA', formula: 'GROSS - TAX' },
    ],
  },
];

async function findOrCreateStructure(definition, existingStructures, usedIds) {
  let structure = existingStructures.find(record => record.code === definition.code && !usedIds.has(String(record._id)));
  if (!structure) structure = existingStructures.find(record => record.name === definition.name && !usedIds.has(String(record._id)));
  if (!structure) structure = existingStructures.find(record => !usedIds.has(String(record._id)));
  if (structure) {
    structure.name = definition.name;
    structure.code = definition.code;
    structure.description = definition.description;
    structure.active = true;
    await structure.save();
  } else {
    structure = await SalaryStructure.create({ name: definition.name, code: definition.code, description: definition.description, active: true });
  }
  usedIds.add(String(structure._id));
  return structure;
}

async function seed() {
  await mongoose.connect(env.mongodbUri);
  const existingStructures = await SalaryStructure.find().sort({ createdAt: 1 });
  const usedIds = new Set();
  const seeded = [];

  for (const definition of definitions) {
    const structure = await findOrCreateStructure(definition, existingStructures, usedIds);
    await SalaryRule.updateMany({ salaryStructure: structure._id }, { $set: { active: false } });
    for (const rule of definition.rules) {
      await SalaryRule.findOneAndUpdate(
        { salaryStructure: structure._id, code: rule.code },
        { $set: { ...rule, salaryStructure: structure._id, active: true } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
    }
    seeded.push({ id: String(structure._id), name: structure.name, code: structure.code, rules: definition.rules.map(rule => rule.code) });
  }

  console.log(JSON.stringify({ seeded }, null, 2));
  await mongoose.disconnect();
}

seed().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
