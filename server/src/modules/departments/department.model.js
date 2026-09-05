'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  description: { type: String, default: '', trim: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
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

schema.index({ code: 1 }, { unique: true });
schema.index({ active: 1, name: 1 });

module.exports = mongoose.models.Department || mongoose.model('Department', schema);
