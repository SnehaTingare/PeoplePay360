'use strict';

const Payslip = require('./payslip.model');
const mongoose = require('mongoose');
const AppError = require('../../core/errors/AppError');
const paginate = require('../../core/http/pagination');
const employeeService = require('../employees/employee.service');
const pdfService = require('./payslipPdf.service');

function createPayslipService({
  Model = Payslip,
  employees = employeeService,
  pdf = pdfService,
  getPayrun = id => require('../payruns/payrun.service').getPayrun(id),
} = {}) {
  const existsForPayrollScope = async ({ employeeId, salaryStructureId, periodStart, periodEnd }) => Boolean(await Model.exists({
    employee: employeeId,
    salaryStructure: salaryStructureId,
    periodStart,
    periodEnd,
  }));
  async function findDuplicateOutsidePayrun({ employeeId, salaryStructureId, periodStart, periodEnd, payrunId, session }) {
    const query = Model.findOne({ employee: employeeId, salaryStructure: salaryStructureId, periodStart, periodEnd, payrun: { $ne: payrunId } });
    if (session) query.session(session);
    return query;
  }
  async function upsertComputedPayslip(snapshot, session) {
    try {
      return await Model.findOneAndUpdate({ payrun: snapshot.payrun, employee: snapshot.employee }, { $set: snapshot }, { upsert: true, new: true, runValidators: true, session });
    } catch (error) {
      if (error.code === 11000) throw new AppError('PAY-006', 'A Payslip already exists for this employee and payroll scope.', 422, 'BLOCKING');
      throw error;
    }
  }
  const removeUnfinalizedPayslipForEmployee = (payrunId, employeeId, session) => Model.deleteOne({ payrun: payrunId, employee: employeeId, status: 'COMPUTED' }, { session });
  async function getPayslip(id) {
    if (!mongoose.isObjectIdOrHexString(id)) throw new AppError('RESOURCE_NOT_FOUND', 'Payslip not found.', 404);
    const record = await Model.findById(id);
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Payslip not found.', 404);
    return record;
  }
  async function listPayslips({ payrunId, employeeId, status, from, to, page, limit }) {
    const filter = {};
    if (payrunId) filter.payrun = payrunId;
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    if (from) filter.periodEnd = { $gte: from };
    if (to) filter.periodStart = { $lte: to };
    return paginate(Model, filter, { page, limit }, { periodStart: -1, _id: -1 });
  }
  async function findForPayrun(payrunId, session) {
    const query = Model.find({ payrun: payrunId });
    if (session) query.session(session);
    return query;
  }
  const updateStatusForPayrun = ({ payrunId, fromStatus, toStatus, session }) => Model.updateMany(
    { payrun: payrunId, status: fromStatus },
    { $set: { status: toStatus } },
    { session },
  );
  async function generatePdfForRecord(payslip, payrun) {
    try {
      const buffer = await pdf.generate({ payslip, payrun });
      const employeeCode = payslip.employeeSnapshot?.employeeId || String(payslip.employee);
      return { buffer, filename: `payslip-${employeeCode.replace(/[^a-z0-9-]/gi, '_')}-${new Date(payslip.periodEnd).toISOString().slice(0, 10)}.pdf` };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('PSL-005', 'Payslip PDF generation failed.', 500);
    }
  }
  async function generatePayslipPdf(id) {
    const payslip = await getPayslip(id);
    if (!['VALIDATED', 'PAID'].includes(payslip.status)) {
      throw new AppError('RESOURCE_CONFLICT', 'Final Payslip PDF is available only for Validated or Paid Payslips.', 409);
    }
    const payrun = await getPayrun(payslip.payrun);
    return generatePdfForRecord(payslip, payrun);
  }
  async function listOwnPaidPayslips(actor, { page = 1, limit = 20 } = {}) {
    const employee = await employees.getOwnEmployee(actor);
    return paginate(Model, { employee: employee._id, status: 'PAID' }, { page, limit }, { periodStart: -1, _id: -1 });
  }
  async function findForReporting({ employeeIds, from, to, statuses } = {}) {
    const filter = {};
    if (employeeIds) filter.employee = { $in: employeeIds };
    if (from) filter.periodEnd = { $gte: from };
    if (to) filter.periodStart = { $lte: to };
    if (statuses) filter.status = { $in: statuses };
    return Model.find(filter);
  }
  return { existsForPayrollScope, findDuplicateOutsidePayrun, upsertComputedPayslip, removeUnfinalizedPayslipForEmployee, getPayslip, listPayslips, findForPayrun, updateStatusForPayrun, generatePdfForRecord, generatePayslipPdf, listOwnPaidPayslips, findForReporting };
}

module.exports = { createPayslipService, ...createPayslipService() };
