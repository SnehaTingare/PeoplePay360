import { ROLES } from '../constants/roles'

export const canManageUsers = (user) => user?.role === ROLES.ADMIN

export const HR_CONFIGURATION_ROLES = [
  ROLES.HR_MANAGER,
  ROLES.HR_PAYROLL_USER,
  ROLES.HR_PAYROLL_MANAGER,
  ROLES.ADMIN,
]

export const canManageHrConfiguration = (user) => HR_CONFIGURATION_ROLES.includes(user?.role)

export const EMPLOYEE_MANAGEMENT_ROLES = HR_CONFIGURATION_ROLES

export const canManageEmployees = (user) => EMPLOYEE_MANAGEMENT_ROLES.includes(user?.role)

export const CONTRACT_MANAGEMENT_ROLES = HR_CONFIGURATION_ROLES

export const canManageContracts = (user) => CONTRACT_MANAGEMENT_ROLES.includes(user?.role)

export const HR_OPERATIONS_ROLES = HR_CONFIGURATION_ROLES

export const canManageHrOperations = (user) => HR_OPERATIONS_ROLES.includes(user?.role)

export const SALARY_CONFIG_READ_ROLES = [ROLES.HR_PAYROLL_USER, ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN]
export const SALARY_CONFIG_MANAGE_ROLES = [ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN]

export const canReadSalaryConfig = (user) => SALARY_CONFIG_READ_ROLES.includes(user?.role)
export const canManageSalaryConfig = (user) => SALARY_CONFIG_MANAGE_ROLES.includes(user?.role)

export const PAYROLL_MANAGEMENT_ROLES = [ROLES.HR_PAYROLL_USER, ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN]
export const canManagePayroll = (user) => PAYROLL_MANAGEMENT_ROLES.includes(user?.role)
