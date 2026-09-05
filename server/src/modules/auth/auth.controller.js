'use strict';

const response = require('../../core/http/response');
const authService = require('./auth.service');

exports.login = async (req, res) => response.resource(res, await authService.login(req.body));
exports.me = (req, res) => response.resource(res, req.user);
exports.changePassword = async (req, res) => response.resource(
  res,
  await authService.changePassword({ userId: req.user.id, ...req.body }),
);
