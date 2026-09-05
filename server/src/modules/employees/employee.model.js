'use strict';

const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  accountHolderName: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  bankName: { type: String, required: true, trim: true },
  ifscCode: { type: String, required: true, trim: true, uppercase: true },
}, { _id: false });

const schema = new mongoose.Schema({
  employeeId: { type: String, required: true, trim: true, uppercase: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  jobPosition: { type: String, required: true, trim: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  employeeType: { type: String, required: true, trim: true, uppercase: true },
  workingSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkingSchedule', required: true },
  joiningDate: { type: Date, required: true },
  bankDetails: { type: bankDetailsSchema, default: null },
  employmentStatus: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
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

schema.index({ employeeId: 1 }, { unique: true });
schema.index({ email: 1 }, { unique: true });
schema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });
schema.index({ department: 1, employmentStatus: 1 });
schema.index({ manager: 1 });

module.exports = mongoose.models.Employee || mongoose.model('Employee', schema);
