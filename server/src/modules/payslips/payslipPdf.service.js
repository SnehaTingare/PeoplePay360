'use strict';

const PDFDocument = require('pdfkit');

const COLORS = Object.freeze({
  navy: '#173B67',
  blue: '#2563EB',
  paleBlue: '#EFF6FF',
  ink: '#172033',
  muted: '#64748B',
  border: '#DCE3ED',
  surface: '#F8FAFC',
  white: '#FFFFFF',
  green: '#15803D',
  paleGreen: '#DCFCE7',
  amber: '#A16207',
  paleAmber: '#FEF3C7',
});

const displayDate = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const money = value => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'N/A';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function createPayslipPdfService({ Document = PDFDocument } = {}) {
  function generate({ payslip, payrun }) {
    return new Promise((resolve, reject) => {
      const document = new Document({
        size: 'A4',
        margin: 44,
        compress: false,
        bufferPages: true,
        info: {
          Title: `Payslip - ${payslip.employeeSnapshot?.employeeId || 'Employee'}`,
          Author: 'PeoplePay360',
          Subject: 'Employee Payslip',
        },
      });
      const chunks = [];
      document.on('data', chunk => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));

      const employee = payslip.employeeSnapshot || {};
      const structure = payslip.salaryStructureSnapshot || {};
      const contract = payslip.contractSnapshot || {};
      const pageWidth = document.page.width;
      const contentWidth = pageWidth - 88;
      const left = 44;
      const bottomLimit = document.page.height - 66;

      const write = (text, x, y, options = {}) => {
        document.text(String(text ?? ''), x, y, options);
      };

      const ensureSpace = height => {
        if (document.y + height <= bottomLimit) return;
        document.addPage();
        document.y = 52;
      };

      const sectionHeading = title => {
        ensureSpace(36);
        const y = document.y;
        document
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(COLORS.navy);
        write(title.toUpperCase(), left, y, { characterSpacing: 0.7 });
        document
          .moveTo(left, y + 17)
          .lineTo(left + contentWidth, y + 17)
          .lineWidth(0.7)
          .strokeColor(COLORS.border)
          .stroke();
        document.y = y + 29;
      };

      const infoLine = (label, value, x, y, width) => {
        document.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
        write(label.toUpperCase(), x, y, { width, characterSpacing: 0.4 });
        document.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink);
        write(value || 'N/A', x, y + 14, { width, ellipsis: true });
      };

      // Branded header
      document.roundedRect(left, 38, contentWidth, 92, 9).fill(COLORS.navy);
      document.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.white);
      write('PeoplePay360', left + 22, 58, { width: 250 });
      document.font('Helvetica').fontSize(9).fillColor('#D6E6FA');
      write('HR & PAYROLL MANAGEMENT', left + 22, 87, { characterSpacing: 1.1 });
      document.font('Helvetica-Bold').fontSize(17).fillColor(COLORS.white);
      write('PAYSLIP', pageWidth - 188, 58, { width: 122, align: 'right' });
      document.font('Helvetica').fontSize(8).fillColor('#D6E6FA');
      write(
        `${displayDate(payslip.periodStart)} - ${displayDate(payslip.periodEnd)}`,
        pageWidth - 244,
        86,
        { width: 178, align: 'right' },
      );

      const status = String(payslip.status || 'N/A').toUpperCase();
      const statusWidth = 76;
      const statusX = pageWidth - 66 - statusWidth;
      document.roundedRect(statusX, 105, statusWidth, 17, 8)
        .fill(status === 'PAID' ? COLORS.paleGreen : COLORS.paleBlue);
      document.font('Helvetica-Bold').fontSize(7)
        .fillColor(status === 'PAID' ? COLORS.green : COLORS.blue);
      write(status, statusX, 110, { width: statusWidth, align: 'center', characterSpacing: 0.6 });

      // Employee and payroll information cards
      const cardY = 148;
      const gap = 14;
      const cardWidth = (contentWidth - gap) / 2;
      document.roundedRect(left, cardY, cardWidth, 112, 7)
        .fillAndStroke(COLORS.surface, COLORS.border);
      document.roundedRect(left + cardWidth + gap, cardY, cardWidth, 112, 7)
        .fillAndStroke(COLORS.surface, COLORS.border);

      const cardLeft = left + 16;
      const cardRight = left + cardWidth + gap + 16;
      document.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.navy);
      write('EMPLOYEE DETAILS', cardLeft, cardY + 14, { characterSpacing: 0.6 });
      write('PAYROLL DETAILS', cardRight, cardY + 14, { characterSpacing: 0.6 });

      infoLine('Employee', employee.name, cardLeft, cardY + 38, cardWidth - 32);
      infoLine('Employee ID', employee.employeeId, cardLeft, cardY + 73, (cardWidth - 38) / 2);
      infoLine(
        'Department',
        employee.departmentName || employee.departmentId || contract.departmentId,
        cardLeft + (cardWidth - 32) / 2,
        cardY + 73,
        (cardWidth - 38) / 2,
      );

      infoLine('Payrun', payrun?.name, cardRight, cardY + 38, cardWidth - 104);
      infoLine('Worked Days', payslip.workedDays ?? 'N/A', cardRight + cardWidth - 88, cardY + 38, 72);
      infoLine('Salary Structure', structure.name || structure.code, cardRight, cardY + 73, (cardWidth - 38) / 2);
      infoLine(
        'Job Position',
        employee.jobPosition || contract.jobPosition,
        cardRight + (cardWidth - 32) / 2,
        cardY + 73,
        (cardWidth - 38) / 2,
      );

      document.y = cardY + 136;
      sectionHeading('Salary Computation');

      const tableColumns = [left, left + 210, left + 302, left + 397];
      const tableWidths = [202, 84, 87, contentWidth - 397];

      const drawTableHeader = () => {
        const y = document.y;
        document.roundedRect(left, y, contentWidth, 27, 4).fill(COLORS.navy);
        document.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white);
        ['RULE NAME', 'CODE', 'CATEGORY', 'AMOUNT'].forEach((value, index) => {
          write(value, tableColumns[index] + 8, y + 9, {
            width: tableWidths[index] - 16,
            align: index === 3 ? 'right' : 'left',
            characterSpacing: 0.35,
          });
        });
        document.y = y + 27;
      };

      const drawSalaryRow = (line, index) => {
        document.font('Helvetica').fontSize(8.5);
        const rowHeight = Math.max(
          26,
          document.heightOfString(String(line.name || ''), { width: tableWidths[0] - 16 }) + 13,
        );
        if (document.y + rowHeight > bottomLimit) {
          document.addPage();
          document.y = 52;
          drawTableHeader();
        }
        const y = document.y;
        document.rect(left, y, contentWidth, rowHeight)
          .fill(index % 2 === 0 ? COLORS.white : COLORS.surface);
        document.moveTo(left, y + rowHeight).lineTo(left + contentWidth, y + rowHeight)
          .lineWidth(0.5).strokeColor(COLORS.border).stroke();
        const values = [line.name, line.code, line.category, money(line.amount)];
        values.forEach((value, columnIndex) => {
          document.font(columnIndex === 3 ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(8.5)
            .fillColor(COLORS.ink);
          write(value || 'N/A', tableColumns[columnIndex] + 8, y + 8, {
            width: tableWidths[columnIndex] - 16,
            align: columnIndex === 3 ? 'right' : 'left',
          });
        });
        document.y = y + rowHeight;
      };

      drawTableHeader();
      (payslip.salaryLines || []).forEach(drawSalaryRow);

      ensureSpace(104);
      document.y += 16;
      sectionHeading('Payment Summary');
      const summaryItems = [
        ['Basic Salary', payslip.basicSalary],
        ['Allowances', payslip.totalAllowances],
        ['Gross Salary', payslip.grossSalary],
        ['Deductions', payslip.totalDeductions],
        ['Net Salary', payslip.netSalary],
      ];
      const summaryWidth = contentWidth / summaryItems.length;
      const summaryY = document.y;
      summaryItems.forEach(([label, value], index) => {
        const x = left + (index * summaryWidth);
        const isNet = index === summaryItems.length - 1;
        document.rect(x, summaryY, summaryWidth, 52)
          .fillAndStroke(isNet ? COLORS.paleBlue : COLORS.white, COLORS.border);
        document.font('Helvetica').fontSize(7.2).fillColor(COLORS.muted);
        write(label.toUpperCase(), x + 6, summaryY + 10, {
          width: summaryWidth - 12,
          align: 'center',
          characterSpacing: 0.25,
        });
        document.font('Helvetica-Bold').fontSize(isNet ? 10.5 : 9).fillColor(isNet ? COLORS.blue : COLORS.ink);
        write(money(value), x + 6, summaryY + 29, { width: summaryWidth - 12, align: 'center' });
      });
      document.y = summaryY + 66;

      const warnings = (payslip.warnings || []).filter(warning => warning.severity === 'WARNING');
      if (warnings.length) {
        ensureSpace(42 + (warnings.length * 24));
        sectionHeading('Notes & Warnings');
        const warningY = document.y;
        const warningHeight = Math.max(44, warnings.reduce((height, warning) => (
          height + document.heightOfString(`${warning.code}: ${warning.message}`, { width: contentWidth - 40 }) + 10
        ), 18));
        document.roundedRect(left, warningY, contentWidth, warningHeight, 6)
          .fillAndStroke(COLORS.paleAmber, '#FDE68A');
        document.font('Helvetica').fontSize(8.5).fillColor(COLORS.amber);
        let y = warningY + 13;
        warnings.forEach(warning => {
          const value = `${warning.code}: ${warning.message}`;
          write(`- ${value}`, left + 14, y, { width: contentWidth - 28 });
          y += document.heightOfString(value, { width: contentWidth - 40 }) + 10;
        });
        document.y = warningY + warningHeight + 8;
      }

      // Add consistent footer after all pages have been buffered.
      const range = document.bufferedPageRange();
      for (let index = 0; index < range.count; index += 1) {
        document.switchToPage(range.start + index);
        const footerY = document.page.height - 57;
        document.moveTo(left, footerY - 9).lineTo(left + contentWidth, footerY - 9)
          .lineWidth(0.5).strokeColor(COLORS.border).stroke();
        document.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted);
        write('CONFIDENTIAL - Generated by PeoplePay360', left, footerY, {
          width: 300,
          lineBreak: false,
        });
        write(`Page ${index + 1} of ${range.count}`, pageWidth - 144, footerY, {
          width: 100,
          align: 'right',
          lineBreak: false,
        });
      }

      document.end();
    });
  }

  return { generate };
}

module.exports = { createPayslipPdfService, ...createPayslipPdfService() };
