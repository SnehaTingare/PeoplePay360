import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../providers/authContext'

export default function RoleRoute({ roles }) {
  const { hasRole } = useAuth()
  return hasRole(...roles) ? <Outlet /> : <Navigate to="/access-denied" replace />
}
