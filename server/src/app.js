'use strict';

const cors = require('cors');
const express = require('express');
const apiRouter = require('./routes');
const notFound = require('./core/middleware/notFound');
const errorHandler = require('./core/middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json());
app.use('/api/v1', apiRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
