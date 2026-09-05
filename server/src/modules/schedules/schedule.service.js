'use strict';

const mongoose = require('mongoose');
const WorkingSchedule = require('./schedule.model');
const AppError = require('../../core/errors/AppError');
const persistenceError = require('../../core/errors/persistenceError');
const paginate = require('../../core/http/pagination');

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toMinutes = value => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

function calculateLineHours(line) {

  if (!line.isWorkingDay) return 0;

  const shiftMinutes =
    toMinutes(line.endTime) - toMinutes(line.startTime);

  if (shiftMinutes <= 0) {
    throw new AppError(
      'SCH-001',
      'End time must be later than start time.',
      422
    );
  }

  if (line.breakMinutes < 0) {
    throw new AppError(
      'SCH-002',
      'Break cannot be negative.',
      422
    );
  }

  if (line.breakMinutes >= shiftMinutes) {
    throw new AppError(
      'SCH-003',
      'Break must be shorter than the shift.',
      422
    );
  }

  // Maximum break = 60 minutes
  if (line.breakMinutes > 60) {
    throw new AppError(
      'SCH-007',
      'Break time cannot exceed 60 minutes.',
      422
    );
  }

  const workingMinutes =
    shiftMinutes - line.breakMinutes;

  // Minimum actual working time = 4 hours
  if (workingMinutes < 240) {
    throw new AppError(
      'SCH-006',
      'Working hours excluding break must be at least 4 hours.',
      422
    );
  }

  return workingMinutes / 60;
}

function calculateWorkingDays(workingDays) {
  const lines = workingDays.map(line => ({ ...line, dailyHours: calculateLineHours(line) }));
  const weeklyHours = lines.reduce((total, line) => total + line.dailyHours, 0);
  return { workingDays: lines, weeklyHours };
}

function createScheduleService({ Model = WorkingSchedule } = {}) {
  async function getSchedule(id) {
    if (!mongoose.isObjectIdOrHexString(id)) throw new AppError('RESOURCE_NOT_FOUND', 'Working Schedule not found.', 404);
    const schedule = await Model.findById(id);
    if (!schedule) throw new AppError('RESOURCE_NOT_FOUND', 'Working Schedule not found.', 404);
    return schedule;
  }
  async function listSchedules({ q, active, page, limit }) {
    const filter = {};
    if (active !== undefined) filter.active = active;
    if (q) filter.name = new RegExp(escapeRegex(q), 'i');
    return paginate(Model, filter, { page, limit }, { name: 1, _id: 1 });
  }
  async function createSchedule(input) {
    const calculated = calculateWorkingDays(input.workingDays);
    try { return await Model.create({ name: input.name, ...calculated, active: true }); }
    catch (error) { throw persistenceError(error); }
  }
  async function updateSchedule(id, input) {
    const schedule = await getSchedule(id);
    if (input.name !== undefined) schedule.name = input.name;
    if (input.workingDays !== undefined) schedule.set(calculateWorkingDays(input.workingDays));
    try { return await schedule.save(); }
    catch (error) { throw persistenceError(error); }
  }
  async function deactivateSchedule(id) {
    const schedule = await getSchedule(id);
    schedule.active = false;
    try { return await schedule.save(); }
    catch (error) { throw persistenceError(error); }
  }
  return { listSchedules, createSchedule, getSchedule, updateSchedule, deactivateSchedule };
}

module.exports = { createScheduleService, ...createScheduleService(), calculateLineHours, calculateWorkingDays };
