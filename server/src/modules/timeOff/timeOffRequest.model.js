'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  timeOffType: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeOffType', required: true },
  allocation: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeOffAllocation', default: null },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: Number, required: true, min: Number.MIN_VALUE, validate: Number.isFinite },
  reason: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REFUSED'], required: true, default: 'PENDING' },
  decisionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decisionAt: Date,
  decisionComment: { type: String, default: '' },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true } });
schema.index({ employee: 1, startDate: 1, endDate: 1 });
schema.index({ employee: 1, status: 1 });
schema.index({ allocation: 1, status: 1 });
module.exports = mongoose.models.TimeOffRequest || mongoose.model('TimeOffRequest', schema);
