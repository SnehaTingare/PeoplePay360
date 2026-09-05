'use strict';

const { ACCOUNT_STATUSES } = require('../constants/statuses');
const AppError = require('../errors/AppError');
const errors = require('../errors/errorCodes');
const { verifyAccessToken } = require('../security/token');
const userService = require('../../modules/users/user.service');

const appError = definition => new AppError(definition.code, definition.message, definition.statusCode);

module.exports = async function authenticate(req, res, next) {
  try {
    const authorization = req.get('authorization');
    const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw appError(errors.AUTH_INVALID_TOKEN);

    let payload;
    try {
      payload = verifyAccessToken(match[1]);
    } catch (error) {
      throw appError(errors.AUTH_INVALID_TOKEN);
    }

    if (!payload.sub) throw appError(errors.AUTH_INVALID_TOKEN);
    const user = await userService.findById(payload.sub);
    if (!user) throw appError(errors.AUTH_INVALID_TOKEN);
    if (user.accountStatus !== ACCOUNT_STATUSES.ACTIVE) throw appError(errors.AUTH_INACTIVE);

    const context = userService.serializeUser(user);
    Object.defineProperty(context, 'status', { value: context.accountStatus, enumerable: false });
    req.user = context;
    next();
  } catch (error) {
    next(error);
  }
};
