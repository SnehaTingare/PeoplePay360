import { ROLES } from '../../shared/constants/roles'
import { canManageContracts, canManageEmployees, canManageHrConfiguration, canManageHrOperations, canManagePayroll, canReadSalaryConfig } from '../../shared/permissions/permissions'

export const navigationFor = (user) => [
  { label: 'Workspace', to: '/', icon: 'WS', end: true },
  ...(user?.role === ROLES.EMPLOYEE ? [{ label: 'My profile', to: '/my-profile', icon: 'ME' }] : []),
  { label: user?.role === ROLES.EMPLOYEE ? 'My attendance' : 'Attendance', to: '/attendance', icon: 'AT' },
  { label: user?.role === ROLES.EMPLOYEE ? 'My time off' : 'Time off requests', to: '/time-off/requests', icon: 'TO' },
  ...(user?.role !== ROLES.EMPLOYEE ? [{ label: 'Allocations', to: '/time-off/allocations', icon: 'BA' }] : []),
  ...(user?.role === ROLES.EMPLOYEE ? [{ label: 'My payslips', to: '/my-payslips', icon: 'PS' }] : []),
  ...(canManageHrOperations(user) ? [{ label: 'Time off types', to: '/time-off/types', icon: 'TT' }] : []),
  ...(canReadSalaryConfig(user) ? [{ label: 'Salary structures', to: '/salary-config/structures', icon: 'SS' }, { label: 'Salary rules', to: '/salary-config/rules', icon: 'SR' }] : []),
  ...(canManagePayroll(user) ? [{ label: 'Payruns', to: '/payroll/payruns', icon: 'PR' }, { label: 'Payslips', to: '/payroll/payslips', icon: 'PL' }, { label: 'Payroll dashboard', to: '/payroll/dashboard', icon: 'DB' }] : []),
  ...(canManageEmployees(user) ? [{ label: 'Employees', to: '/employees', icon: 'EM' }] : []),
  ...(canManageContracts(user) ? [{ label: 'Contracts', to: '/contracts', icon: 'CO' }] : []),
  ...(canManageHrConfiguration(user) ? [
    { label: 'Departments', to: '/departments', icon: 'DE' },
    { label: 'Working schedules', to: '/working-schedules', icon: 'SC' },
  ] : []),
  ...(user?.role === ROLES.ADMIN ? [{ label: 'Users', to: '/users', icon: 'US' }] : []),
  { label: 'Notifications', to: '/notifications', icon: 'NT' },
]
