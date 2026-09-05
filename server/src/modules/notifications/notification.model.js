'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  severity: { type: String, enum: ['INFO', 'WARNING', 'ACTION_REQUIRED'], required: true },
  entityType: { type: String, default: null, trim: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  dedupeKey: { type: String, required: true, trim: true },
  readAt: { type: Date, default: null },
}, { timestamps: true, toJSON: { virtuals: true, transform(document, value) { delete value.__v; return value; } } });

schema.index({ user: 1, dedupeKey: 1 }, { unique: true });
schema.index({ user: 1, createdAt: -1 });
schema.index({ user: 1, readAt: 1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', schema);
