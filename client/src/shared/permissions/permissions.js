import { ROLES } from '../constants/roles'

export const canManageUsers = (user) => user?.role === ROLES.ADMIN
