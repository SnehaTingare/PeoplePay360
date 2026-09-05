'use strict';

const mongoose = require('mongoose');

const workingDaySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  },
  isWorkingDay: { type: Boolean, required: true },
  startTime: { type: String, default: null },
  endTime: { type: String, default: null },
  breakMinutes: { type: Number, required: true, min: 0 },
  dailyHours: { type: Number, required: true, min: 0 },
}, { _id: false });

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  workingDays: { type: [workingDaySchema], required: true },
  weeklyHours: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true },
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

schema.index({ active: 1, name: 1 });

module.exports = mongoose.models.WorkingSchedule || mongoose.model('WorkingSchedule', schema);
