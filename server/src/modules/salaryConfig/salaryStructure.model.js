'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } } });
schema.index({ code: 1 }, { unique: true });
module.exports = mongoose.models.SalaryStructure || mongoose.model('SalaryStructure', schema);
