'use strict';

const mongoose = require('mongoose');
const roles = require('../../core/constants/roles');
const { ACCOUNT_STATUSES, ACCOUNT_STATUS_VALUES } = require('../../core/constants/statuses');

const schema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: Object.values(roles) },
  accountStatus: { type: String, required: true, enum: ACCOUNT_STATUS_VALUES, default: ACCOUNT_STATUSES.ACTIVE },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  mustChangePassword: { type: Boolean, required: true, default: true },
  lastLogin: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    transform(document, value) {
      value.id = String(value._id);
      delete value._id;
      delete value.__v;
      delete value.passwordHash;
      return value;
    },
  },
});

schema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model('User', schema);
