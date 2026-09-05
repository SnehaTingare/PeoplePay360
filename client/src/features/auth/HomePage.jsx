import { Link } from 'react-router-dom'
import { useAuth } from '../../app/providers/authContext'
import { canManageUsers } from '../../shared/permissions/permissions'

export default function HomePage() {
  const { user } = useAuth()
  return <section><header className="page-header"><div><p className="eyebrow">Workspace</p><h1>Welcome, {user.firstName}</h1><p>Your PeoplePay360 account is ready.</p></div></header>{canManageUsers(user) && <Link className="feature-card" to="/users"><span className="feature-icon">♙</span><div><h2>User administration</h2><p>Create users, manage roles and control account access.</p></div><span>→</span></Link>}</section>
}
