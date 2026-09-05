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
    icon: 'WS',
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
          icon: 'ME',
        },

        {
          label: 'My attendance',
          to: '/attendance',
          icon: 'AT',
        },

        {
          label: 'My time off',
          to: '/time-off/requests',
          icon: 'TO',
        },

        {
          label: 'My payslips',
          to: '/my-payslips',
          icon: 'PS',
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
          icon: 'EM',

          children: [

            ...(canManageEmployees(user)
              ? [
                  {
                    label: 'Employees',
                    to: '/employees',
                    icon: 'EM',
                  },
                ]
              : []),

            ...(canManageHrConfiguration(user)
              ? [

                  {
                    label: 'Working schedules',
                    to: '/working-schedules',
                    icon: 'SC',
                  },

                  {
                    label: 'Departments',
                    to: '/departments',
                    icon: 'DE',
                  },

                ]
              : []),

            ...(user?.role === ROLES.ADMIN
              ? [
                  {
                    label: 'Users',
                    to: '/users',
                    icon: 'US',
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
          icon: 'CO',
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
          icon: 'AT',
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
          icon: 'TO',

          children: [

            {
              label: 'Time off requests',
              to: '/time-off/requests',
              icon: 'TO',
            },

            {
              label: 'Allocations',
              to: '/time-off/allocations',
              icon: 'BA',
            },

            ...(canManageHrOperations(user)
              ? [
                  {
                    label: 'Time off types',
                    to: '/time-off/types',
                    icon: 'TT',
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
          icon: 'PR',

          children: [

            ...(canManagePayroll(user)
              ? [

                  {
                    label: 'Payroll Dashboard',
                    to: '/payroll/dashboard',
                    icon: 'DB',
                  },

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

                ]
              : []),

            ...(canReadSalaryConfig(user)
              ? [

                  {
                    label: 'Salary Structures',
                    to: '/salary-config/structures',
                    icon: 'SS',
                  },

                  {
                    label: 'Salary Rules',
                    to: '/salary-config/rules',
                    icon: 'SR',
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
    icon: 'NT',
  },

]