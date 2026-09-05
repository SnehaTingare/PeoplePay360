'use strict';

const response = require('../../core/http/response');
const { ACCOUNT_STATUSES } = require('../../core/constants/statuses');
const service = require('./user.service');

exports.listUsers = async (req, res) => response.collection(res, await service.listUsers(req.validatedQuery));
exports.createUser = async (req, res) => response.resource(res, await service.createUser(req.body), 201);
exports.getUser = async (req, res) => response.resource(res, await service.getUser(req.params.id));
exports.updateUser = async (req, res) => response.resource(res, await service.updateUser(req.params.id, req.body));
exports.changeRole = async (req, res) => response.resource(res, await service.changeRole(req.params.id, req.body.role));
exports.activateUser = async (req, res) => response.resource(
  res, await service.setAccountStatus(req.params.id, ACCOUNT_STATUSES.ACTIVE),
);
exports.deactivateUser = async (req, res) => response.resource(
  res, await service.setAccountStatus(req.params.id, ACCOUNT_STATUSES.INACTIVE),
);
exports.resetPassword = async (req, res) => response.resource(res, await service.resetPassword(req.params.id));
