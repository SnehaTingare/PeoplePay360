'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  unit: { type: String, required: true, enum: ['DAYS', 'HOURS'] },
  requiresAllocation: { type: Boolean, required: true },
  requiresApproval: { type: Boolean, required: true },
  isPaid: { type: Boolean, required: true },
  payrollTreatment: { type: String, required: true, enum: ['NONE', 'PAID', 'UNPAID_DEDUCTION'] },
  active: { type: Boolean, default: true },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } } });
schema.index({ code: 1 }, { unique: true });
module.exports = mongoose.models.TimeOffType || mongoose.model('TimeOffType', schema);
