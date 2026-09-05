'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  salaryStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET'] },
  sequence: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  calculationType: { type: String, required: true, enum: ['FIXED', 'PERCENTAGE', 'FORMULA'] },
  fixedAmount: { type: Number, min: 0, validate: Number.isFinite },
  percentage: { type: Number, min: 0, validate: Number.isFinite },
  percentageBase: String,
  formula: String,
  active: { type: Boolean, default: true },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } } });
schema.index({ salaryStructure: 1, code: 1 }, { unique: true });
schema.index({ salaryStructure: 1, active: 1, sequence: 1 });
module.exports = mongoose.models.SalaryRule || mongoose.model('SalaryRule', schema);
