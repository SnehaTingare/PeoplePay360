'use strict';

const mongoose = require('mongoose');

const CONTRACT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  RUNNING: 'RUNNING',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
});

const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  jobPosition: { type: String, required: true, trim: true },
  workingSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkingSchedule', required: true },
  salaryStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
  wage: { type: Number, required: true, min: 0 },
  wageType: { type: String, required: true, enum: ['MONTHLY'] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  status: { type: String, required: true, enum: Object.values(CONTRACT_STATUSES), default: CONTRACT_STATUSES.DRAFT },
}, {
  timestamps: true,
  optimisticConcurrency: true,
  toJSON: {
    virtuals: true,
    transform(document, value) {
      delete value.__v;
      return value;
    },
  },
});

schema.index({ employee: 1, startDate: 1, endDate: 1 });
schema.index({ employee: 1, status: 1 });
schema.index({ salaryStructure: 1 });

const Contract = mongoose.models.Contract || mongoose.model('Contract', schema);

module.exports = Contract;
module.exports.CONTRACT_STATUSES = CONTRACT_STATUSES;
