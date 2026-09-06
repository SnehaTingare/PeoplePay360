import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/authContext'
import { NotificationBell } from '../../features/notifications'
import favicon from '../../assets/favicon.svg'
import ConfirmDialog from '../../shared/components/ConfirmDialog/ConfirmDialog'
import Icon from '../../shared/components/Icon/Icon'
import { roleLabel } from '../../shared/constants/roles'
import { navigationFor } from '../navigation/roleNavigation'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState({})
  const nav = navigationFor(user)
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const toggleMenu = (label) => {
    setOpenMenus((current) => ({ ...current, [label]: !current[label] }))
  }

  const isRouteActive = (to) => Boolean(to) && (
    location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`))
  )

  const isChildActive = (item) => item.children?.some((child) => isRouteActive(child.to))

  const pageTitle = nav.reduce((title, item) => {
    if (title) return title
    if (isRouteActive(item.to)) return item.label
    return item.children?.find((child) => isRouteActive(child.to))?.label || ''
  }, '') || 'PeoplePay360'

  return (
    <>
      <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
        <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
          <div className="brand">
            <span className="brand-mark"><img src={favicon} alt="PeoplePay360" /></span>
            <div className="brand-copy"><strong>PeoplePay360</strong><small>HR & Payroll</small></div>
            <button className="sidebar-collapse" aria-label="Collapse navigation" onClick={() => setCollapsed(!collapsed)}>
              <Icon name="menu" size={18} />
            </button>
          </div>

          <p className="sidebar-label">Workspace</p>
          <nav>
            {nav.map((item) => {
              if (item.children?.length) {
                const active = isChildActive(item)
                const menuOpen = openMenus[item.label] ?? active

                return (
                  <div key={item.label} className={`nav-group ${active ? 'nav-group--active' : ''}`}>
                    <button type="button" className={`nav-group-button ${active ? 'active' : ''}`} onClick={() => toggleMenu(item.label)}>
                      <Icon name={item.icon} size={19} />
                      <span>{item.label}</span>
                      <span className={`nav-arrow ${menuOpen ? 'nav-arrow--open' : ''}`}><Icon name="chevronDown" size={16} /></span>
                    </button>
                    {menuOpen && (
                      <div className="nav-submenu">
                        {item.children.map((child) => (
                          <NavLink key={child.to} to={child.to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active nav-submenu-link' : 'nav-submenu-link'}>
                            <Icon name={child.icon} size={17} />
                            <span>{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <button className="change-password-button" onClick={() => navigate('/change-password')} title="Change password">
              <Icon name="key" size={18} />
              <span>Change password</span>
            </button>
            <button className="signout-button" onClick={() => setLogoutConfirmationOpen(true)}>
              <Icon name="logout" size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-title">
              <button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}><Icon name="menu" /></button>
              <div><p>Workspace</p><strong>{pageTitle}</strong></div>
            </div>
            <div className="topbar-actions">
              <NotificationBell />
              <div className="topbar-user">
                <span className="avatar">{initials}</span>
                <span><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></span>
              </div>
            </div>
          </header>
          <main className="page-content"><Outlet /></main>
        </div>

        {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      </div>

      <ConfirmDialog
        open={logoutConfirmationOpen}
        title="Log out?"
        message="Are you sure you want to log out?"
        confirmLabel="Logout"
        onCancel={() => setLogoutConfirmationOpen(false)}
        onConfirm={signOut}
      />
    </>
  )
}
