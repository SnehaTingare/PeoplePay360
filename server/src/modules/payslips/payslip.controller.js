'use strict';
const response = require('../../core/http/response');
const defaultService = require('./payslip.service');
module.exports = function createPayslipController(service = defaultService) { return {
  list: async (req, res) => response.collection(res, await service.listPayslips(req.validatedQuery)),
  me: async (req, res) => response.collection(res, await service.listOwnPaidPayslips(req.user, req.validatedQuery)),
  get: async (req, res) => response.resource(res, await service.getPayslipForActor(req.params.id, req.user)),
  pdf: async (req, res) => {
    const result = await service.generatePayslipPdf(req.params.id, req.user);
    res.status(200).set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${result.filename}"` }).send(result.buffer);
  },
}; };
