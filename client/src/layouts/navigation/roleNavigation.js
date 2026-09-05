import { ROLES } from '../../shared/constants/roles'
import { canManageEmployees, canManageHrConfiguration } from '../../shared/permissions/permissions'

export const navigationFor = (user) => [
  ...(user?.role === ROLES.EMPLOYEE ? [{ label: 'My profile', to: '/my-profile', icon: 'profile' }] : []),
  ...(user?.role === ROLES.ADMIN ? [{ label: 'Users', to: '/users', icon: 'users' }] : []),
  ...(canManageEmployees(user) ? [{ label: 'Employees', to: '/employees', icon: 'employees' }] : []),
  ...(canManageHrConfiguration(user) ? [
    { label: 'Departments', to: '/departments', icon: 'departments' },
    { label: 'Working schedules', to: '/working-schedules', icon: 'schedules' },
  ] : []),
]
