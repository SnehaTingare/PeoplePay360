import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/authContext'
import { roleLabel } from '../../shared/constants/roles'
import { navigationFor } from '../navigation/roleNavigation'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const nav = navigationFor(user)
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
  const signOut = () => { logout(); navigate('/login', { replace: true }) }
  return <div className="app-shell"><aside className={`sidebar ${open ? 'sidebar--open' : ''}`}><div className="brand"><span className="brand-mark">P</span><div><strong>PeoplePay360</strong><small>HR & Payroll</small></div></div><nav>{nav.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><span className="nav-icon">♙</span>{item.label}</NavLink>)}</nav><div className="sidebar-footer"><button className="button-link" onClick={() => navigate('/change-password')}>Change password</button><button className="button-link" onClick={signOut}>Sign out</button></div></aside><div className="app-main"><header className="topbar"><button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>☰</button><div className="topbar-spacer" /><div className="user-summary"><span className="avatar">{initials}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></div></div></header><main className="page-content"><Outlet /></main></div>{open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}</div>
}
