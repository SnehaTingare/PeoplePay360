'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  timeOffType: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeOffType', required: true },
  allocatedAmount: { type: Number, required: true, min: 0, validate: Number.isFinite },
  takenAmount: { type: Number, required: true, default: 0, min: 0, validate: Number.isFinite },
  remainingAmount: { type: Number, required: true, min: 0, validate: Number.isFinite },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  status: { type: String, enum: ['DRAFT', 'APPROVED', 'CANCELLED'], default: 'DRAFT', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true } });
schema.index({ employee: 1, timeOffType: 1, status: 1, validFrom: 1, validUntil: 1 });
schema.index({ employee: 1, status: 1 });
module.exports = mongoose.models.TimeOffAllocation || mongoose.model('TimeOffAllocation', schema);
