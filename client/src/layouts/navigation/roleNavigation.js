import { ROLES } from '../../shared/constants/roles'

export const navigationFor = (user) => user?.role === ROLES.ADMIN ? [{ label: 'Users', to: '/users', icon: 'users' }] : []
