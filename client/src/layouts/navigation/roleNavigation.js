import { ROLES } from '../../shared/constants/roles'

import {
  canManageContracts,
  canManageEmployees,
  canManageHrConfiguration,
  canManageHrOperations,
  canManagePayroll,
  canReadSalaryConfig,
} from '../../shared/permissions/permissions'

export const navigationFor = (user) => [

  // =========================
  // WORKSPACE
  // =========================

  {
    label: 'Workspace',
    to: '/',
    icon: 'workspace',
    end: true,
  },


  // =========================
  // EMPLOYEE PERSONAL NAVIGATION
  // =========================

  ...(user?.role === ROLES.EMPLOYEE
    ? [

        {
          label: 'My profile',
          to: '/my-profile',
          icon: 'profile',
        },

        {
          label: 'My attendance',
          to: '/attendance',
          icon: 'attendance',
        },

        {
          label: 'My time off',
          to: '/time-off/requests',
          icon: 'timeOff',
        },

        {
          label: 'My payslips',
          to: '/my-payslips',
          icon: 'payslips',
        },

      ]
    : []),


  // =========================
  // EMPLOYEES GROUP
  // Employees
  // Working schedules
  // Departments
  // Users
  // =========================

  ...(user?.role !== ROLES.EMPLOYEE &&
    (
      canManageEmployees(user) ||
      canManageHrConfiguration(user) ||
      user?.role === ROLES.ADMIN
    )
    ? [

        {
          label: 'Employees',
          icon: 'employees',

          children: [

            ...(canManageEmployees(user)
              ? [
                  {
                    label: 'Employees',
                    to: '/employees',
                    icon: 'employees',
                  },
                ]
              : []),

            ...(canManageHrConfiguration(user)
              ? [

                  {
                    label: 'Working schedules',
                    to: '/working-schedules',
                    icon: 'schedules',
                  },

                  {
                    label: 'Departments',
                    to: '/departments',
                    icon: 'departments',
                  },

                ]
              : []),

            ...(user?.role === ROLES.ADMIN
              ? [
                  {
                    label: 'Users',
                    to: '/users',
                    icon: 'users',
                  },
                ]
              : []),

          ],
        },

      ]
    : []),


  // =========================
  // CONTRACTS
  // No dropdown
  // =========================

  ...(canManageContracts(user)
    ? [
        {
          label: 'Contracts',
          to: '/contracts',
          icon: 'contracts',
        },
      ]
    : []),


  // =========================
  // ATTENDANCE
  // No dropdown
  // =========================

  ...(user?.role !== ROLES.EMPLOYEE
    ? [
        {
          label: 'Attendance',
          to: '/attendance',
          icon: 'attendance',
        },
      ]
    : []),


  // =========================
  // TIME OFF GROUP
  // =========================

  ...(user?.role !== ROLES.EMPLOYEE
    ? [

        {
          label: 'Time Off',
          icon: 'timeOff',

          children: [

            {
              label: 'Time off requests',
              to: '/time-off/requests',
              icon: 'timeOff',
            },

            {
              label: 'Allocations',
              to: '/time-off/allocations',
              icon: 'allocations',
            },

            ...(canManageHrOperations(user)
              ? [
                  {
                    label: 'Time off types',
                    to: '/time-off/types',
                    icon: 'timeOffTypes',
                  },
                ]
              : []),

          ],
        },

      ]
    : []),


  // =========================
  // PAYROLL GROUP
  // =========================

  ...(canManagePayroll(user) || canReadSalaryConfig(user)
    ? [

        {
          label: 'Payrolls',
          icon: 'payroll',

          children: [

            ...(canManagePayroll(user)
              ? [

                  {
                    label: 'Payroll Dashboard',
                    to: '/payroll/dashboard',
                    icon: 'dashboard',
                  },

                  {
                    label: 'Payruns',
                    to: '/payroll/payruns',
                    icon: 'payruns',
                  },

                  {
                    label: 'Payslips',
                    to: '/payroll/payslips',
                    icon: 'payslips',
                  },

                ]
              : []),

            ...(canReadSalaryConfig(user)
              ? [

                  {
                    label: 'Salary Structures',
                    to: '/salary-config/structures',
                    icon: 'salaryStructures',
                  },

                  {
                    label: 'Salary Rules',
                    to: '/salary-config/rules',
                    icon: 'salaryRules',
                  },

                ]
              : []),

          ],
        },

      ]
    : []),


  // =========================
  // NOTIFICATIONS
  // =========================

  {
    label: 'Notifications',
    to: '/notifications',
    icon: 'notifications',
  },

]
