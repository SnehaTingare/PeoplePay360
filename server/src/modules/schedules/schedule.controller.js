'use strict';

const response = require('../../core/http/response');
const defaultService = require('./schedule.service');

module.exports = function createScheduleController(service = defaultService) {
  return {
    list: async (req, res) => response.collection(res, await service.listSchedules(req.validatedQuery)),
    create: async (req, res) => response.resource(res, await service.createSchedule(req.body), 201),
    get: async (req, res) => response.resource(res, await service.getSchedule(req.params.id)),
    update: async (req, res) => response.resource(res, await service.updateSchedule(req.params.id, req.body)),
    deactivate: async (req, res) => response.resource(res, await service.deactivateSchedule(req.params.id)),
  };
};
