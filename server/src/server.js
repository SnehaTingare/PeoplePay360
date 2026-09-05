'use strict';

const app = require('./app');
const { connectDatabase } = require('./config/database');
const { assertRuntimeEnvironment, env } = require('./config/env');
const bootstrapAdmin = require('./modules/users/bootstrapAdmin.service');

async function startServer() {
  assertRuntimeEnvironment();
  await connectDatabase();
  await bootstrapAdmin.provision();
  return app.listen(env.port, () => {
    console.info(`PeoplePay360 API listening on port ${env.port}.`);
  });
}

if (require.main === module) {
  startServer().catch(() => {
    console.error('PeoplePay360 API failed to start.');
    process.exitCode = 1;
  });
}

module.exports = { startServer };
