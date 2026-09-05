'use strict';

const app = require('./app');
const { connectDatabase } = require('./config/database');
const { assertRuntimeEnvironment, env } = require('./config/env');
const bootstrapAdmin = require('./modules/users/bootstrapAdmin.service');

async function startServer() {
  assertRuntimeEnvironment();
  await connectDatabase();
  await bootstrapAdmin.provision();
  return new Promise((resolve, reject) => {
    const server = app.listen(env.port, error => {
      if (error){
        reject(error);
        return;
      }
      console.info(`PeoplePay360 API listening on port ${env.port}.`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch(() => {
    console.error('PeoplePay360 API failed to start.');
    process.exitCode = 1;
  });
}

module.exports = { startServer };
