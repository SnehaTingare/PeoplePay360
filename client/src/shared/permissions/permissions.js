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
