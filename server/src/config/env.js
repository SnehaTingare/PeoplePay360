'use strict';

require('dotenv').config({ quiet: true });

const parsedPort = Number(process.env.PORT || 5000);

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : null,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
});

function assertRuntimeEnvironment() {
  if (!env.port || !env.mongodbUri || !env.jwtSecret) {
    throw new Error('Required server environment configuration is missing or invalid.');
  }
}

function getBootstrapAdminConfig() {
  return {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME,
    lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME,
  };
}

module.exports = { env, assertRuntimeEnvironment, getBootstrapAdminConfig };
