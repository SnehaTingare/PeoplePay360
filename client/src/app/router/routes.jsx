import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout/AuthLayout'
import AppLayout from '../../layouts/AppLayout/AppLayout'
import AccessDeniedPage from '../../features/auth/AccessDeniedPage'
import ChangePasswordPage from '../../features/auth/ChangePasswordPage'
import HomePage from '../../features/auth/HomePage'
import LoginPage from '../../features/auth/LoginPage'
import CreateUserPage from '../../features/users/CreateUserPage'
import UserDetailPage from '../../features/users/UserDetailPage'
import UsersPage from '../../features/users/UsersPage'
import DepartmentFormPage from '../../features/departments/pages/DepartmentFormPage'
import DepartmentListPage from '../../features/departments/pages/DepartmentListPage'
import ScheduleFormPage from '../../features/schedules/pages/ScheduleFormPage'
import ScheduleListPage from '../../features/schedules/pages/ScheduleListPage'
import { ROLES } from '../../shared/constants/roles'
import { HR_CONFIGURATION_ROLES } from '../../shared/permissions/permissions'
import ProtectedRoute from './ProtectedRoute'
import RoleRoute from './RoleRoute'

export default function AppRoutes() {
  return <Routes><Route element={<AuthLayout />}><Route path="/login" element={<LoginPage />} /></Route><Route element={<ProtectedRoute />}><Route path="/change-password" element={<AuthLayout />}><Route index element={<ChangePasswordPage />} /></Route><Route element={<AppLayout />}><Route index element={<HomePage />} /><Route path="access-denied" element={<AccessDeniedPage />} /><Route element={<RoleRoute roles={[ROLES.ADMIN]} />}><Route path="users" element={<UsersPage />} /><Route path="users/new" element={<CreateUserPage />} /><Route path="users/:id" element={<UserDetailPage />} /></Route><Route element={<RoleRoute roles={HR_CONFIGURATION_ROLES} />}><Route path="departments" element={<DepartmentListPage />} /><Route path="departments/new" element={<DepartmentFormPage />} /><Route path="departments/:id/edit" element={<DepartmentFormPage />} /><Route path="working-schedules" element={<ScheduleListPage />} /><Route path="working-schedules/new" element={<ScheduleFormPage />} /><Route path="working-schedules/:id/edit" element={<ScheduleFormPage />} /></Route></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}
