'use strict';

require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const Employee = require('../src/modules/employees/employee.model');
const Contract = require('../src/modules/contracts/contract.model');
const Schedule = require('../src/modules/schedules/schedule.model');
const Attendance = require('../src/modules/attendance/attendance.model');
const TimeOffType = require('../src/modules/timeOff/timeOffType.model');
const TimeOffAllocation = require('../src/modules/timeOff/allocation.model');
const TimeOffRequest = require('../src/modules/timeOff/timeOffRequest.model');
const User = require('../src/modules/users/user.model');

const periodStart = new Date('2026-08-01T00:00:00.000Z');
const periodEnd = new Date('2026-08-31T23:59:59.999Z');
const employeeIds = ['6a9bf503de143c0df851e783', '6a9c6dcc20a4d7de8574cabc'];
const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function dateOnly(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function dateKey(value) {
  return dateOnly(value).toISOString().slice(0, 10);
}

function scheduledDays(schedule) {
  const working = new Map(schedule.workingDays.filter(day => day.isWorkingDay).map(day => [dayNames.indexOf(day.day), day]));
  const dates = [];
  for (let cursor = dateOnly(periodStart); cursor <= periodEnd; cursor = new Date(cursor.getTime() + 86400000)) {
    const line = working.get(cursor.getUTCDay());
    if (line) dates.push({ date: new Date(cursor), line });
  }
  return dates;
}

function atTime(date, value) {
  return new Date(`${dateKey(date)}T${value}:00.000Z`);
}

async function upsertType(definition) {
  return TimeOffType.findOneAndUpdate(
    { code: definition.code },
    { $set: definition },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function seed() {
  await mongoose.connect(env.mongodbUri);
  const employees = await Employee.find({ _id: { $in: employeeIds }, employmentStatus: 'ACTIVE' });
  if (employees.length !== employeeIds.length) throw new Error('Expected both August payrun employees to be active.');
  const admin = await User.findOne({ role: 'ADMIN' });
  const unpaidType = await upsertType({ name: 'Demo Unpaid Leave', code: 'DEMO_UNPAID', description: 'Seeded demo unpaid leave.', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, isPaid: false, payrollTreatment: 'UNPAID_DEDUCTION', active: true });
  const paidType = await upsertType({ name: 'Demo Paid Leave', code: 'DEMO_PAID', description: 'Seeded demo paid leave.', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, isPaid: true, payrollTreatment: 'PAID', active: true });

  const leavePlans = [
    { employee: employees[0], type: unpaidType, start: '2026-08-10', end: '2026-08-11', reason: 'Seeded unpaid leave demo.' },
    { employee: employees[1], type: paidType, start: '2026-08-17', end: '2026-08-17', reason: 'Seeded paid leave demo.' },
  ];

  const seededRequests = [];
  for (const plan of leavePlans) {
    const allocation = await TimeOffAllocation.findOneAndUpdate(
      { employee: plan.employee._id, timeOffType: plan.type._id, validFrom: periodStart, validUntil: periodEnd },
      { $set: { allocatedAmount: 5, takenAmount: 0, remainingAmount: 5, status: 'APPROVED', approvedBy: admin?._id, approvedAt: new Date() } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    const duration = plan.start === plan.end ? 1 : 2;
    const request = await TimeOffRequest.findOneAndUpdate(
      { employee: plan.employee._id, timeOffType: plan.type._id, startDate: new Date(`${plan.start}T00:00:00.000Z`), endDate: new Date(`${plan.end}T00:00:00.000Z`) },
      { $set: { allocation: allocation._id, duration, reason: plan.reason, status: 'APPROVED', decisionBy: admin?._id, decisionAt: new Date() } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    await TimeOffAllocation.updateOne({ _id: allocation._id }, { $set: { takenAmount: duration, remainingAmount: 5 - duration } });
    seededRequests.push({ employee: String(plan.employee._id), type: plan.type.code, dates: `${plan.start} to ${plan.end}`, request: String(request._id) });
  }

  const leaveDates = new Map(leavePlans.map(plan => [String(plan.employee._id), new Set([plan.start, ...(plan.end === plan.start ? [] : [plan.end])])]));
  let attendanceCount = 0;
  for (const employee of employees) {
    const schedule = await Schedule.findById(employee.workingSchedule);
    if (!schedule) throw new Error(`Missing schedule for ${employee.employeeId}.`);
    for (const { date, line } of scheduledDays(schedule)) {
      if (leaveDates.get(String(employee._id)).has(dateKey(date))) continue;
      const late = String(employee._id) === employeeIds[0] && dateKey(date) === '2026-08-05';
      const checkIn = atTime(date, line.startTime);
      if (late) checkIn.setUTCMinutes(checkIn.getUTCMinutes() + 15);
      const checkOut = atTime(date, line.endTime);
      await Attendance.findOneAndUpdate(
        { employee: employee._id, date },
        { $set: { employee: employee._id, date, checkIn, checkOut, workedMinutes: (checkOut - checkIn) / 60000, workedHours: (checkOut - checkIn) / 3600000, status: late ? 'LATE' : 'PRESENT', notes: 'Seeded August payroll demo.', manualEdit: false } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
      attendanceCount++;
    }
  }

  console.log(JSON.stringify({ period: '2026-08', employees: employeeIds, attendanceUpserted: attendanceCount, approvedLeave: seededRequests }, null, 2));
  await mongoose.disconnect();
}

seed().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
