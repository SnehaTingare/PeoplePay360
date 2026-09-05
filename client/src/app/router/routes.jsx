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
import { ROLES } from '../../shared/constants/roles'
import ProtectedRoute from './ProtectedRoute'
import RoleRoute from './RoleRoute'

export default function AppRoutes() {
  return <Routes><Route element={<AuthLayout />}><Route path="/login" element={<LoginPage />} /></Route><Route element={<ProtectedRoute />}><Route path="/change-password" element={<AuthLayout />}><Route index element={<ChangePasswordPage />} /></Route><Route element={<AppLayout />}><Route index element={<HomePage />} /><Route path="access-denied" element={<AccessDeniedPage />} /><Route element={<RoleRoute roles={[ROLES.ADMIN]} />}><Route path="users" element={<UsersPage />} /><Route path="users/new" element={<CreateUserPage />} /><Route path="users/:id" element={<UserDetailPage />} /></Route></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}
