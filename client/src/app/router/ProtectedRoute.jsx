import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/authContext'
import LoadingState from '../../shared/components/LoadingState/LoadingState'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()
  if (isLoading) return <LoadingState fullPage label="Validating your session…" />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />
  return <Outlet />
}
