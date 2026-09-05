'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, default: null },
  workedMinutes: { type: Number, min: 0, default: 0 },
  workedHours: { type: Number, min: 0, default: 0 },
  status: { type: String, required: true, enum: ['OPEN', 'PRESENT', 'LATE', 'OVERTIME', 'ABSENT', 'MISSING_CHECKOUT'] },
  notes: { type: String, default: '' },
  manualEdit: { type: Boolean, default: false },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  correctionReason: { type: String, default: '' },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true } });
schema.index({ employee: 1, date: 1 });
schema.index({ employee: 1, status: 1 });
schema.index({ employee: 1 }, { unique: true, partialFilterExpression: { status: 'OPEN' }, name: 'one_open_attendance_per_employee' });
module.exports = mongoose.models.Attendance || mongoose.model('Attendance', schema);
