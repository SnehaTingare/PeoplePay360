'use strict';

const response = require('../../core/http/response');
const notificationService = require('./notification.service');

module.exports = function createNotificationController(service = notificationService) {
  return {
    list: async (req, res) => response.collection(res, await service.listNotifications(req.user, req.validatedQuery)),
    read: async (req, res) => response.resource(res, await service.markRead(req.params.id, req.user)),
    readAll: async (req, res) => response.resource(res, await service.markAllRead(req.user)),
  };
};
