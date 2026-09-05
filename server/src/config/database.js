'use strict';

const mongoose = require('mongoose');
const { env } = require('./env');

const connectDatabase = () => mongoose.connect(env.mongodbUri);
const disconnectDatabase = () => mongoose.disconnect();

module.exports = { connectDatabase, disconnectDatabase };
