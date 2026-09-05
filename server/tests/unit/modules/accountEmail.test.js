'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAccountEmailService } = require('../../../src/modules/notifications/accountEmail.service');
const roles = require('../../../src/core/constants/roles');
const User = require('../../../src/modules/users/user.model');
const userService = require('../../../src/modules/users/user.service');

test('account invitation email includes temporary credentials and frontend login link', async () => {
  const messages = [];
  const service = createAccountEmailService({
    env: {
      SMTP_FROM: 'PeoplePay360 <no-reply@example.com>',
      CLIENT_URL: 'https://peoplepay360.example.com/',
    },
    getTransporter: () => ({
      sendMail: async message => {
        messages.push(message);
        return { messageId: 'message-1' };
      },
    }),
  });

  await service.sendTemporaryPassword({
    to: 'employee@example.com',
    firstName: 'Asha',
    temporaryPassword: 'Temp@1234',
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'employee@example.com');
  assert.equal(messages[0].from, 'PeoplePay360 <no-reply@example.com>');
  assert.match(messages[0].text, /Temp@1234/);
  assert.match(messages[0].text, /https:\/\/peoplepay360\.example\.com\/login/);
  assert.match(messages[0].html, /Sign in to PeoplePay360/);
  assert.match(messages[0].html, /must|required to choose a new password/i);
});

test('Admin-created internal User receives their generated temporary password', async t => {
  const deliveries = [];
  t.mock.method(User, 'exists', async () => false);
  t.mock.method(User, 'create', async data => ({ ...data }));

  const result = await userService.createUser({
    firstName: 'Priya',
    lastName: 'Manager',
    email: 'PRIYA@example.com',
    role: roles.HR_MANAGER,
  }, {
    emails: {
      sendTemporaryPassword: async message => deliveries.push(message),
    },
  });

  assert.equal(result.emailDelivery, 'SENT');
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].to, 'priya@example.com');
  assert.equal(deliveries[0].temporaryPassword, result.temporaryPassword);
  assert.equal(result.user.mustChangePassword, true);
});
