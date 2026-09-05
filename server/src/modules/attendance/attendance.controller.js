'use strict';
const defaultService = require('./attendance.service');
const response = require('../../core/http/response');
module.exports = function createAttendanceController(service = defaultService) {
  return {
    mine: async (req, res) => response.collection(res, await service.listAttendance(req.query, req.user, true)),
    list: async (req, res) => response.collection(res, await service.listAttendance(req.query, req.user)),
    get: async (req, res) => response.resource(res, await service.getAttendance(req.params.id, req.user)),
    checkIn: async (req, res) => response.resource(res, await service.checkIn(req.user, req.body), 201),
    checkOut: async (req, res) => response.resource(res, await service.checkOut(req.user, req.body)),
    create: async (req, res) => response.resource(res, await service.createManualAttendance(req.body, req.user), 201),
    correct: async (req, res) => response.resource(res, await service.correctAttendance(req.params.id, req.body, req.user)),
  };
};
