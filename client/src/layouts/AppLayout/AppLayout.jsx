import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/authContext'
import { roleLabel } from '../../shared/constants/roles'
import ConfirmDialog from '../../shared/components/ConfirmDialog/ConfirmDialog'
import Icon from '../../shared/components/Icon/Icon'
import { navigationFor } from '../navigation/roleNavigation'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Stores which dropdown menus are open
  const [openMenus, setOpenMenus] = useState({})

  const nav = navigationFor(user)

  const initials =
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Toggle a dropdown menu
  const toggleMenu = (label) => {
    setOpenMenus((current) => ({
      ...current,
      [label]: !current[label],
    }))
  }

  // Checks whether any child route is currently active
  const isChildActive = (item) => {
    return item.children?.some((child) => {
      if (!child.to) return false

      return (
        location.pathname === child.to ||
        (child.to !== '/' &&
          location.pathname.startsWith(`${child.to}/`))
      )
    })
  }

  // Find page title from parent or child navigation
  const getPageTitle = () => {
    for (const item of nav) {
      // Normal navigation item
      if (item.to) {
        if (
          location.pathname === item.to ||
          (item.to !== '/' &&
            location.pathname.startsWith(`${item.to}/`))
        ) {
          return item.label
        }
      }

      // Dropdown navigation item
      if (item.children) {
        const activeChild = item.children.find(
          (child) =>
            location.pathname === child.to ||
            (child.to !== '/' &&
              location.pathname.startsWith(`${child.to}/`))
        )

        if (activeChild) {
          return activeChild.label
        }
      }
    }

    return 'PeoplePay360'
  }

  const pageTitle = getPageTitle()

  return (
    <>
      <div
        className={`app-shell ${
          collapsed ? 'app-shell--collapsed' : ''
        }`}
      >
        <aside
          className={`sidebar ${
            open ? 'sidebar--open' : ''
          }`}
        >
          {/* ================= BRAND ================= */}

          <div className="brand">
            <span className="brand-mark">P</span>

            <div className="brand-copy">
              <strong>PeoplePay360</strong>
              <small>HR & Payroll</small>
            </div>

            <button
              className="sidebar-collapse"
              aria-label="Collapse navigation"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Icon name="menu" size={18} />
            </button>
          </div>

          <p className="sidebar-label"></p>

          {/* ================= NAVIGATION ================= */}

          <nav>
            {nav.map((item) => {

              // ========================================
              // DROPDOWN ITEM
              // ========================================

              if (item.children?.length) {
                const active = isChildActive(item)

                const menuOpen =
                  openMenus[item.label] ?? active

                return (
                  <div
                    key={item.label}
                    className={`nav-group ${
                      active ? 'nav-group--active' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className={`nav-group-button ${
                        active ? 'active' : ''
                      }`}
                      onClick={() => toggleMenu(item.label)}
                    >
                      <Icon
                        name={item.icon}
                        size={19}
                      />

                      <span>{item.label}</span>

                      <span
                        className={`nav-arrow ${
                          menuOpen ? 'nav-arrow--open' : ''
                        }`}
                      >
                        ▾
                      </span>
                    </button>

                    {menuOpen && (
                      <div className="nav-submenu">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                              isActive
                                ? 'active nav-submenu-link'
                                : 'nav-submenu-link'
                            }
                          >
                            <Icon
                              name={child.icon}
                              size={17}
                            />

                            <span>
                              {child.label}
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              // ========================================
              // NORMAL NAVIGATION ITEM
              // ========================================

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    isActive ? 'active' : ''
                  }
                >
                  <Icon
                    name={item.icon}
                    size={19}
                  />

                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* ================= SIDEBAR FOOTER ================= */}

          <div className="sidebar-footer">
           <button
  className="change-password-button"
  onClick={() => navigate('/change-password')}
  title="Change Password"
>
  <Icon name="key" size={18} />
  <span>Change Password</span>
</button>
            <button
              className="signout-button"
              onClick={() =>
                setLogoutConfirmationOpen(true)
              }
            >
              <Icon
                name="logout"
                size={18}
              />

              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* ================= MAIN ================= */}

        <div className="app-main">

          <header className="topbar">

            <div className="topbar-title">

              <button
                className="menu-button"
                aria-label="Toggle navigation"
                onClick={() => setOpen(!open)}
              >
                <Icon name="menu" />
              </button>

              <div>
                <p>Workspace</p>
                <strong>{pageTitle}</strong>
              </div>

            </div>

            <div className="topbar-actions">

              <div className="notification-wrap">

                <button
                  className="icon-button"
                  type="button"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  title="Notifications"
                  onClick={() =>
                    setNotificationsOpen(
                      (current) => !current
                    )
                  }
                >
                  <Icon
                    name="bell"
                    size={19}
                  />
                </button>

                {notificationsOpen && (
                  <section
                    className="notification-popover"
                    aria-label="Notifications"
                  >
                    <div>
                      <strong>
                        Notifications
                      </strong>

                      <button
                        aria-label="Close notifications"
                        onClick={() =>
                          setNotificationsOpen(false)
                        }
                      >
                        ×
                      </button>
                    </div>

                    <p>
                      You’re all caught up.
                      Updates from your workspace
                      will appear here.
                    </p>
                  </section>
                )}

              </div>

              <div className="topbar-user">
  <span className="avatar">{initials}</span>

  <span>
    <strong>{user.firstName} {user.lastName}</strong>
    <small>{roleLabel(user.role)}</small>
  </span>
</div>
</div>

          </header>

          <main className="page-content">
            <Outlet />
          </main>

        </div>

        {open && (
          <button
            className="sidebar-scrim"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
        )}

      </div>

      <ConfirmDialog
        open={logoutConfirmationOpen}
        title="Log out?"
        message="Are you sure you want to log out?"
        confirmLabel="Logout"
        onCancel={() =>
          setLogoutConfirmationOpen(false)
        }
        onConfirm={signOut}
      />
    </>
  )
}