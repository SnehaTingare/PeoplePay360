'use strict';

const nodemailer = require('nodemailer');

let transporter;

function getMailTransporter(env = process.env) {
  if (transporter) return transporter;
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
  if (required.some(key => !env[key])) {
    throw new Error('SMTP configuration is incomplete.');
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: String(env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return transporter;
}

function resetMailTransporter() {
  transporter = undefined;
}

module.exports = { getMailTransporter, resetMailTransporter };
