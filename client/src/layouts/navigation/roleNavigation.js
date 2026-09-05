import { ROLES } from '../../shared/constants/roles'
import { canManageHrConfiguration } from '../../shared/permissions/permissions'

export const navigationFor = (user) => [
  ...(user?.role === ROLES.ADMIN ? [{ label: 'Users', to: '/users', icon: 'users' }] : []),
  ...(canManageHrConfiguration(user) ? [
    { label: 'Departments', to: '/departments', icon: 'departments' },
    { label: 'Working schedules', to: '/working-schedules', icon: 'schedules' },
  ] : []),
]
