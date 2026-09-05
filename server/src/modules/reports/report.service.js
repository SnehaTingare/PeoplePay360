'use strict';

const employeeService = require('../employees/employee.service');
const departmentService = require('../departments/department.service');
const attendanceService = require('../attendance/attendance.service');
const timeOffService = require('../timeOff/timeOff.service');
const contractService = require('../contracts/contract.service');
const payrunService = require('../payruns/payrun.service');
const payslipService = require('../payslips/payslip.service');

const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const countBy = (rows, key, values) => Object.fromEntries(values.map(value => [value, rows.filter(row => row[key] === value).length]));

function createReportService({
  employees = employeeService,
  departments = departmentService,
  attendance = attendanceService,
  timeOff = timeOffService,
  contracts = contractService,
  payruns = payrunService,
  payslips = payslipService,
} = {}) {
  async function payrollDashboard(filters = {}) {
    const employeeRows = await employees.findForReporting({ departmentId: filters.departmentId, employeeType: filters.employeeType });
    const filtered = Boolean(filters.departmentId || filters.employeeType);
    const employeeIds = filtered ? employeeRows.map(employee => employee._id) : undefined;
    const scope = { employeeIds, from: filters.from, to: filters.to };
    const [payrunRows, payslipRows, attendanceRows, leaveRows, contractRows] = await Promise.all([
      payruns.findForReporting(scope),
      payslips.findForReporting(scope),
      attendance.findForReporting(scope),
      timeOff.findRequestsForReporting(scope),
      contracts.findAttentionForReporting({ employeeIds, through: filters.to || new Date(Date.now() + 30 * 86400000) }),
    ]);
    const paid = payslipRows.filter(payslip => payslip.status === 'PAID');
    const totalNetSalaryPaid = paid.reduce((sum, payslip) => sum + Number(payslip.netSalary || 0), 0);
    const averageSalary = paid.length ? totalNetSalaryPaid / paid.length : 0;
    const attendanceCounts = countBy(attendanceRows, 'status', ['PRESENT', 'LATE', 'ABSENT', 'OVERTIME', 'MISSING_CHECKOUT']);
    const attendanceGood = attendanceCounts.PRESENT + attendanceCounts.LATE + attendanceCounts.OVERTIME;
    const attendanceHealth = attendanceRows.length ? round(attendanceGood * 100 / attendanceRows.length) : 0;
    const leaveCounts = countBy(leaveRows, 'status', ['APPROVED', 'PENDING', 'REFUSED']);
    const departmentIds = [...new Set(paid.map(payslip => String(payslip.employeeSnapshot?.departmentId || payslip.contractSnapshot?.departmentId || '')).filter(Boolean))];
    const departmentRows = departmentIds.length ? await departments.findByIds(departmentIds) : [];
    const departmentNames = new Map(departmentRows.map(department => [String(department._id), department.name]));
    const salaryGroups = new Map();
    for (const payslip of paid) {
      const departmentId = String(payslip.employeeSnapshot?.departmentId || payslip.contractSnapshot?.departmentId || 'UNASSIGNED');
      const group = salaryGroups.get(departmentId) || { departmentId, departmentName: departmentNames.get(departmentId) || 'Unassigned', employees: new Set(), totalNetSalary: 0 };
      group.employees.add(String(payslip.employee));
      group.totalNetSalary += Number(payslip.netSalary || 0);
      salaryGroups.set(departmentId, group);
    }
    const salaryByDepartment = [...salaryGroups.values()].map(group => ({ departmentId: group.departmentId, departmentName: group.departmentName, headcount: group.employees.size, totalNetSalary: round(group.totalNetSalary) }));
    const trend = new Map();
    for (const payslip of paid) {
      const month = new Date(payslip.periodEnd).toISOString().slice(0, 7);
      trend.set(month, (trend.get(month) || 0) + Number(payslip.netSalary || 0));
    }
    const payrollBlockingWarnings = payrunRows.flatMap(payrun => (payrun.warnings || []).filter(issue => issue.severity === 'BLOCKING').map(issue => ({ payrunId: String(payrun._id), ...issue })));
    const payrollWarnings = payrunRows.flatMap(payrun => (payrun.warnings || []).filter(issue => issue.severity !== 'BLOCKING').map(issue => ({ payrunId: String(payrun._id), ...issue })));
    const attendanceExceptions = attendanceRows.filter(record => record.status === 'MISSING_CHECKOUT' || record.manualEdit).map(record => ({ attendanceId: String(record._id), employeeId: String(record.employee), status: record.status, manualEdit: Boolean(record.manualEdit) }));
    const contractAttention = contractRows.map(contract => ({ contractId: String(contract._id), employeeId: String(contract.employee), status: contract.status, endDate: contract.endDate || null }));
    const payrollStatus = countBy(payrunRows, 'status', ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID']);
    const approvedDays = leaveRows.filter(request => request.status === 'APPROVED').reduce((sum, request) => sum + Number(request.duration || 0), 0);
    return {
      filters: { from: filters.from?.toISOString().slice(0, 10) || null, to: filters.to?.toISOString().slice(0, 10) || null, departmentId: filters.departmentId || null, employeeType: filters.employeeType || null },
      kpis: { totalNetSalaryPaid: round(totalNetSalaryPaid), payslipsGenerated: payslipRows.length, averageSalary: round(averageSalary), averageNetSalary: round(averageSalary), approvedTimeOff: leaveCounts.APPROVED, attendanceHealth },
      payrollStatus,
      salaryByDepartment,
      monthlyNetSalaryTrend: [...trend.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, totalNetSalary]) => ({ month, totalNetSalary: round(totalNetSalary) })),
      attendanceOverview: { present: attendanceCounts.PRESENT, late: attendanceCounts.LATE, absent: attendanceCounts.ABSENT, overtime: attendanceCounts.OVERTIME, missingCheckout: attendanceCounts.MISSING_CHECKOUT, manualCorrections: attendanceRows.filter(record => record.manualEdit).length },
      timeOffOverview: { approved: leaveCounts.APPROVED, pending: leaveCounts.PENDING, refused: leaveCounts.REFUSED, approvedDays: round(approvedDays) },
      attention: { payrollBlockingWarnings, payrollWarnings, contractAttention, attendanceExceptions },
      payrollWarnings: [...payrollBlockingWarnings, ...payrollWarnings],
      departmentOverview: salaryByDepartment.map(group => ({ departmentId: group.departmentId, departmentName: group.departmentName, headcount: group.headcount })),
    };
  }
  return { payrollDashboard };
}

module.exports = { createReportService, ...createReportService() };
