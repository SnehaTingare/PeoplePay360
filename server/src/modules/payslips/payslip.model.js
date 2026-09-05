'use strict';

const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({ code: String, severity: { type: String, enum: ['WARNING', 'BLOCKING'] }, message: String, details: mongoose.Schema.Types.Mixed }, { _id: false });
const lineSchema = new mongoose.Schema({
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRule', required: true }, name: String, code: String,
  category: { type: String, enum: ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET'], required: true },
  sequence: Number, calculationType: { type: String, enum: ['FIXED', 'PERCENTAGE', 'FORMULA'], required: true },
  calculationSnapshot: mongoose.Schema.Types.Mixed, amount: { type: Number, required: true },
}, { _id: false });
const schema = new mongoose.Schema({
  payrun: { type: mongoose.Schema.Types.ObjectId, ref: 'Payrun', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
  salaryStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  status: { type: String, enum: ['COMPUTED', 'VALIDATED', 'PAID'], default: 'COMPUTED', required: true },
  workedDays: { type: Number, required: true, min: 0 },
  payrollContext: { type: mongoose.Schema.Types.Mixed, required: true },
  employeeSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  contractSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  salaryStructureSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  salaryLines: { type: [lineSchema], required: true },
  basicSalary: { type: Number, required: true }, totalAllowances: { type: Number, required: true },
  grossSalary: { type: Number, required: true }, totalDeductions: { type: Number, required: true }, netSalary: { type: Number, required: true },
  warnings: { type: [warningSchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true, transform(doc, value) { delete value.__v; return value; } } });

schema.index({ employee: 1, salaryStructure: 1, periodStart: 1, periodEnd: 1 }, { unique: true });
schema.index({ payrun: 1, employee: 1 }, { unique: true });

module.exports = mongoose.models.Payslip || mongoose.model('Payslip', schema);
