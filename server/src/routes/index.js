'use strict';

const { Router } = require('express');
const authenticate = require('../core/middleware/authenticate');
const authRouter = require('../modules/auth/auth.routes');
const userRouter = require('../modules/users/user.routes');
const createSalaryConfigRouter = require('../modules/salaryConfig/salaryConfig.routes');
const createTimeOffRouter = require('../modules/timeOff/timeOff.routes');
const createAttendanceRouter = require('../modules/attendance/attendance.routes');
const createDepartmentRouter = require('../modules/departments/department.routes');
const createScheduleRouter = require('../modules/schedules/schedule.routes');
const createEmployeeRouter = require('../modules/employees/employee.routes');
const createContractRouter = require('../modules/contracts/contract.routes');
const createPayrunRouter = require('../modules/payruns/payrun.routes');
const createPayslipRouter = require('../modules/payslips/payslip.routes');
const createReportRouter = require('../modules/reports/report.routes');
const createNotificationRouter = require('../modules/notifications/notification.routes');
const employeeService = require('../modules/employees/employee.service');
const scheduleService = require('../modules/schedules/schedule.service');
const { createAttendanceService } = require('../modules/attendance/attendance.service');
const { createTimeOffService } = require('../modules/timeOff/timeOff.service');

const router = Router();
const normalizeEmployee = record => {
  const employee = typeof record?.toObject === 'function' ? record.toObject() : record;
  return { ...employee, id: String(employee._id || employee.id), status: employee.employmentStatus || employee.status };
};
const hrEmployees = {
  getEmployee: async id => normalizeEmployee(await employeeService.getEmployee(id)),
  getEmployeeForUser: async userId => normalizeEmployee(await employeeService.resolveEmployeeForUser(userId)),
  getEmployeeIdsByDepartment: employeeService.getEmployeeIdsByDepartment,
  lockEmployeeForLeave: async (id, options) => normalizeEmployee(await employeeService.lockEmployeeForLeave(id, options)),
};
const hrSchedules = {
  getAttendanceContext: async (employeeId, at) => {
    const employee = await employeeService.getEmployee(employeeId);
    return scheduleService.getAttendanceContext(employee.workingSchedule, at);
  },
  getWorkingIntervals: async (employeeId, options) => {
    const employee = await employeeService.getEmployee(employeeId);
    return scheduleService.getWorkingIntervals(employee.workingSchedule, options);
  },
};
const attendanceService = createAttendanceService({ employees: hrEmployees, schedules: hrSchedules });
const timeOffService = createTimeOffService({ employees: hrEmployees, schedules: hrSchedules });
const salaryConfigRouter = createSalaryConfigRouter({ authenticate });
const timeOffRouter = createTimeOffRouter({ authenticate, service: timeOffService });
const attendanceRouter = createAttendanceRouter({ authenticate, service: attendanceService });
const departmentRouter = createDepartmentRouter({ authenticate });
const scheduleRouter = createScheduleRouter({ authenticate });
const employeeRouter = createEmployeeRouter({ authenticate });
const contractRouter = createContractRouter({ authenticate });
const payrunRouter = createPayrunRouter({ authenticate });
const payslipRouter = createPayslipRouter({ authenticate });
const reportRouter = createReportRouter({ authenticate });
const notificationRouter = createNotificationRouter({ authenticate });

const useForPrefix = (prefix, childRouter) => (req, res, next) => {
  if (!req.path.startsWith(prefix)) return next();
  return childRouter(req, res, next);
};

router.get('/health', (req, res) => res.status(200).json({ data: { status: 'ok' } }));
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/departments', departmentRouter);
router.use('/working-schedules', scheduleRouter);
router.use('/employees', employeeRouter);
router.use('/contracts', contractRouter);
router.use('/payroll/payruns', payrunRouter);
router.use('/payroll/payslips', payslipRouter);
router.use('/dashboard', reportRouter);
router.use('/notifications', notificationRouter);
router.use(useForPrefix('/payroll/', salaryConfigRouter));
router.use(useForPrefix('/time-off/', timeOffRouter));
router.use(useForPrefix('/attendance', attendanceRouter));

module.exports = router;
