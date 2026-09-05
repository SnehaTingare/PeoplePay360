import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/authContext'
import { useTheme } from '../../app/providers/themeContext'
import { roleLabel } from '../../shared/constants/roles'
import ConfirmDialog from '../../shared/components/ConfirmDialog/ConfirmDialog'
import Icon from '../../shared/components/Icon/Icon'
import { navigationFor } from '../navigation/roleNavigation'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const nav = navigationFor(user)
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
  const signOut = () => { logout(); navigate('/login', { replace: true }) }
  const pageTitle = nav.find((item) => item.to === location.pathname)?.label
    || nav.find((item) => item.to !== '/' && location.pathname.startsWith(`${item.to}/`))?.label
    || 'PeoplePay360'
  return <><div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}><aside className={`sidebar ${open ? 'sidebar--open' : ''}`}><div className="brand"><span className="brand-mark">P</span><div className="brand-copy"><strong>PeoplePay360</strong><small>HR & Payroll</small></div><button className="sidebar-collapse" aria-label="Collapse navigation" onClick={() => setCollapsed(!collapsed)}><Icon name="menu" size={18} /></button></div><p className="sidebar-label">Workspace</p><nav>{nav.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon name={item.icon} size={19} /><span>{item.label}</span></NavLink>)}</nav><div className="sidebar-footer"><button className="sidebar-profile" onClick={() => navigate('/change-password')} title="Account security"><span className="avatar">{initials}</span><span><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></span></button><button className="signout-button" onClick={() => setLogoutConfirmationOpen(true)}><Icon name="logout" size={18} /><span>Sign out</span></button></div></aside><div className="app-main"><header className="topbar"><div className="topbar-title"><button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}><Icon name="menu" /></button><div><p>Workspace</p><strong>{pageTitle}</strong></div></div><div className="topbar-actions"><div className="notification-wrap"><button className="icon-button" type="button" aria-label="Notifications" aria-expanded={notificationsOpen} title="Notifications" onClick={() => setNotificationsOpen((current) => !current)}><Icon name="bell" size={19} /></button>{notificationsOpen && <section className="notification-popover" aria-label="Notifications"><div><strong>Notifications</strong><button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}>×</button></div><p>You’re all caught up. Updates from your workspace will appear here.</p></section>}</div><button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} title={`Switch to ${isDark ? 'light' : 'dark'} mode`}><Icon name={isDark ? 'sun' : 'moon'} size={18} /><span>{isDark ? 'Light' : 'Dark'}</span></button><button className="topbar-user" onClick={() => navigate('/change-password')}><span className="avatar">{initials}</span><span><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></span></button></div></header><main className="page-content"><Outlet /></main></div>{open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}</div><ConfirmDialog open={logoutConfirmationOpen} title="Log out?" message="Are you sure you want to log out?" confirmLabel="Logout" onCancel={() => setLogoutConfirmationOpen(false)} onConfirm={signOut} /></>
}
