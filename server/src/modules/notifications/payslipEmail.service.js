'use strict';

const { getMailTransporter } = require('../../config/mail');

function createPayslipEmailService({ getTransporter = getMailTransporter, env = process.env } = {}) {
  async function sendPayslip({ to, subject, filename, pdf }) {
    return getTransporter().sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text: 'Your PeoplePay360 Payslip is attached.',
      attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
    });
  }
  return { sendPayslip };
}

module.exports = { createPayslipEmailService, ...createPayslipEmailService() };
