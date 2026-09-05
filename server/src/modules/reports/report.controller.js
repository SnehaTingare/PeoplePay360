'use strict';

const response = require('../../core/http/response');
const reportService = require('./report.service');

module.exports = function createReportController(service = reportService) {
  return { payrollDashboard: async (req, res) => response.resource(res, await service.payrollDashboard(req.validatedQuery)) };
};
