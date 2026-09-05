'use strict';

const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');

function jwtSecret() {
  if (!env.jwtSecret) throw new Error('JWT configuration is missing.');
  return env.jwtSecret;
}

const signAccessToken = userId => jwt.sign({}, jwtSecret(), {
  subject: String(userId),
  expiresIn: env.jwtExpiresIn,
});
const verifyAccessToken = token => jwt.verify(token, jwtSecret());

module.exports = { signAccessToken, verifyAccessToken };
