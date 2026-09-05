'use strict';

const PDFDocument = require('pdfkit');

const displayDate = value => new Date(value).toISOString().slice(0, 10);
const money = value => Number(value).toFixed(2);

function createPayslipPdfService({ Document = PDFDocument } = {}) {
  function generate({ payslip, payrun }) {
    return new Promise((resolve, reject) => {
      const document = new Document({ margin: 48, size: 'A4', compress: false });
      const chunks = [];
      document.on('data', chunk => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));

      const employee = payslip.employeeSnapshot || {};
      const structure = payslip.salaryStructureSnapshot || {};
      const contract = payslip.contractSnapshot || {};
      document.fontSize(18).text('PeoplePay360 / Payslip', { align: 'center' }).moveDown();
      document.fontSize(11);
      document.text(`Employee: ${employee.name || 'N/A'} (${employee.employeeId || 'N/A'})`);
      if (employee.departmentName || employee.departmentId || contract.departmentId) {
        document.text(`Department: ${employee.departmentName || employee.departmentId || contract.departmentId}`);
      }
      if (employee.jobPosition || contract.jobPosition) document.text(`Job Position: ${employee.jobPosition || contract.jobPosition}`);
      document.text(`Payrun: ${payrun?.name || 'N/A'}`);
      document.text(`Salary Structure: ${structure.name || structure.code || 'N/A'}`);
      document.text(`Period: ${displayDate(payslip.periodStart)} to ${displayDate(payslip.periodEnd)}`);
      document.text(`Status: ${payslip.status}`);
      document.text(`Worked Days: ${payslip.workedDays}`).moveDown();

      document.fontSize(13).text('Salary Computation').moveDown(0.5);
      const columns = [48, 230, 320, 425];
      const widths = [175, 85, 95, 120];
      const drawRow = (values, bold = false) => {
        if (document.y > 730) document.addPage();
        const y = document.y;
        document.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        values.forEach((value, index) => document.text(String(value ?? ''), columns[index], y, { width: widths[index], align: index === 3 ? 'right' : 'left' }));
        document.y = y + 18;
      };
      drawRow(['Rule Name', 'Code', 'Category', 'Amount'], true);
      for (const line of payslip.salaryLines || []) drawRow([line.name, line.code, line.category, money(line.amount)]);

      document.moveDown().font('Helvetica-Bold').fontSize(13).text('Summary').moveDown(0.5);
      document.font('Helvetica').fontSize(10);
      for (const [label, value] of [
        ['Basic', payslip.basicSalary],
        ['Allowances', payslip.totalAllowances],
        ['Gross', payslip.grossSalary],
        ['Deductions', payslip.totalDeductions],
        ['Net Salary', payslip.netSalary],
      ]) document.text(`${label}: ${money(value)}`);

      const warnings = (payslip.warnings || []).filter(warning => warning.severity === 'WARNING');
      if (warnings.length) {
        document.moveDown().font('Helvetica-Bold').text('Warnings');
        document.font('Helvetica');
        for (const warning of warnings) document.text(`${warning.code}: ${warning.message}`);
      }
      document.end();
    });
  }
  return { generate };
}

module.exports = { createPayslipPdfService, ...createPayslipPdfService() };
