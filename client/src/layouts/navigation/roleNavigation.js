import { ROLES } from '../../shared/constants/roles'

import {
  canManageContracts,
  canManageEmployees,
  canManageHrConfiguration,
  canManageHrOperations,
  canManagePayroll,
  canReadSalaryConfig,
} from '../../shared/permissions/permissions'

export const navigationFor = (user) => {
  const role = user?.role

  return [
    // =========================================================
    // WORKSPACE
    // =========================================================
    {
      label: 'Workspace',
      to: '/',
      icon: 'WS',
      end: true,
    },

    // =========================================================
    // EMPLOYEE ONLY
    // =========================================================
    ...(role === ROLES.EMPLOYEE
      ? [
          {
            label: 'My profile',
            to: '/my-profile',
            icon: 'ME',
          },
        ]
      : []),

    // =========================================================
    // ATTENDANCE
    // =========================================================
    {
      label: role === ROLES.EMPLOYEE ? 'My attendance' : 'Attendance',
      to: '/attendance',
      icon: 'AT',
    },

    // =========================================================
    // TIME OFF REQUESTS
    // ONLY EMPLOYEE CAN SEE THIS
    // =========================================================
    ...(role === ROLES.EMPLOYEE
      ? [
          {
            label: 'My time off',
            to: '/time-off/requests',
            icon: 'TO',
          },
        ]
      : []),

    // =========================================================
    // ALLOCATIONS
    // NON-EMPLOYEE ROLES
    // =========================================================
    ...(role !== ROLES.EMPLOYEE
      ? [
          {
            label: 'Allocations',
            to: '/time-off/allocations',
            icon: 'BA',
          },
        ]
      : []),

    // =========================================================
    // EMPLOYEE PAYSLIPS
    // =========================================================
    ...(role === ROLES.EMPLOYEE
      ? [
          {
            label: 'My payslips',
            to: '/my-payslips',
            icon: 'PS',
          },
        ]
      : []),

    // =========================================================
    // TIME OFF TYPES
    // =========================================================
    ...(canManageHrOperations(user)
      ? [
          {
            label: 'Time off types',
            to: '/time-off/types',
            icon: 'TT',
          },
        ]
      : []),

    // =========================================================
    // SALARY CONFIGURATION
    // =========================================================
    ...(canReadSalaryConfig(user)
      ? [
          {
            label: 'Salary structures',
            to: '/salary-config/structures',
            icon: 'SS',
          },
          {
            label: 'Salary rules',
            to: '/salary-config/rules',
            icon: 'SR',
          },
        ]
      : []),

    // =========================================================
    // PAYROLL
    // =========================================================
    ...(canManagePayroll(user)
      ? [
          {
            label: 'Payruns',
            to: '/payroll/payruns',
            icon: 'PR',
          },
          {
            label: 'Payslips',
            to: '/payroll/payslips',
            icon: 'PL',
          },
          {
            label: 'Payroll dashboard',
            to: '/payroll/dashboard',
            icon: 'DB',
          },
        ]
      : []),

    // =========================================================
    // EMPLOYEES
    // =========================================================
    ...(canManageEmployees(user)
      ? [
          {
            label: 'Employees',
            to: '/employees',
            icon: 'EM',
          },
        ]
      : []),

    // =========================================================
    // CONTRACTS
    // =========================================================
    ...(canManageContracts(user)
      ? [
          {
            label: 'Contracts',
            to: '/contracts',
            icon: 'CO',
          },
        ]
      : []),

    // =========================================================
    // HR CONFIGURATION
    // =========================================================
    ...(canManageHrConfiguration(user)
      ? [
          {
            label: 'Departments',
            to: '/departments',
            icon: 'DE',
          },
          {
            label: 'Working schedules',
            to: '/working-schedules',
            icon: 'SC',
          },
        ]
      : []),

    // =========================================================
    // ADMIN ONLY
    // =========================================================
    ...(role === ROLES.ADMIN
      ? [
          {
            label: 'Users',
            to: '/users',
            icon: 'US',
          },
        ]
      : []),

    // =========================================================
    // NOTIFICATIONS
    // =========================================================
    {
      label: 'Notifications',
      to: '/notifications',
      icon: 'NT',
    },
  ]
}