'use strict';

const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_SALT_ROUNDS = 12;

const hashPassword = password => bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
const comparePassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);
const generateTemporaryPassword = () => randomBytes(18).toString('base64url');

module.exports = { PASSWORD_MIN_LENGTH, hashPassword, comparePassword, generateTemporaryPassword };
