'use strict';

const mongoose = require('mongoose');
const AppError = require('../../core/errors/AppError');

const fail = (message, field) => { throw new AppError('VALIDATION_ERROR', message, 400, 'ERROR', { field }); };
function list({ query }) {
  const unknown = Object.keys(query).find(key => !['page', 'limit', 'unread'].includes(key));
  if (unknown) fail('Unexpected query field.', unknown);
  const result = { page: Number(query.page || 1), limit: Number(query.limit || 20) };
  if (!Number.isInteger(result.page) || result.page < 1 || !Number.isInteger(result.limit) || result.limit < 1 || result.limit > 100) fail('Invalid pagination.', 'page');
  if (query.unread !== undefined) {
    if (!['true', 'false'].includes(query.unread)) fail('unread must be true or false.', 'unread');
    result.unread = query.unread === 'true';
  }
  return { query: result };
}
function params({ params: value }) {
  if (!mongoose.isObjectIdOrHexString(value.id)) fail('Invalid notification identifier.', 'id');
  return { params: { id: value.id } };
}

module.exports = { list, params };
