import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/providers/authContext'
import { usersApi } from '.'
import { getApiError } from '../../shared/api/apiError'
import ConfirmDialog from '../../shared/components/ConfirmDialog/ConfirmDialog'
import DataTable from '../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../shared/components/ErrorBanner/ErrorBanner'
import Icon from '../../shared/components/Icon/Icon'
import LoadingState from '../../shared/components/LoadingState/LoadingState'
import Pagination from '../../shared/components/Pagination/Pagination'
import StatusBadge from '../../shared/components/StatusBadge/StatusBadge'
import TemporaryPasswordDialog from '../../shared/components/TemporaryPasswordDialog/TemporaryPasswordDialog'
import { ACCOUNT_STATUSES } from '../../shared/constants/statuses'
import { ROLES, ROLE_OPTIONS, roleLabel } from '../../shared/constants/roles'

const INTERNAL_ROLE_OPTIONS = ROLE_OPTIONS.filter(
  (role) =>
    role !== ROLES.EMPLOYEE &&
    role !== ROLES.ADMIN
)

export default function UsersPage() {
  const location = useLocation()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ q: '', role: '', accountStatus: '', page: 1, limit: 10 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')
  const [confirm, setConfirm] = useState(null)
  const [temporaryResult, setTemporaryResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
    try { const result = await usersApi.list(params); setUsers(result.data); setMeta(result.meta) }
    catch (requestError) { setError(getApiError(requestError).message) }
    finally { setLoading(false) }
  }, [filters])
  useEffect(() => { const timer = setTimeout(load, filters.q ? 300 : 0); return () => clearTimeout(timer) }, [load, filters.q])

  const requestAction = (user, type) => setConfirm({
    user, type,
    title: type === 'deactivate' ? 'Deactivate user?' : type === 'activate' ? 'Activate user?' : type === 'role' ? 'Change user role?' : 'Reset password?',
    message: type === 'reset' ? `A new temporary password will replace the password for ${user.email}.` : type === 'role' ? `Change ${user.email} to ${roleLabel(user.pendingRole)}?` : `${type === 'deactivate' ? 'Deactivate' : 'Activate'} ${user.email}?`,
  })
  const runAction = async () => {
    setBusy(true); setError('')
    try {
      if (confirm.type === 'role') await usersApi.changeRole(confirm.user.id, confirm.user.pendingRole)
      else if (confirm.type === 'reset') setTemporaryResult(await usersApi.resetPassword(confirm.user.id))
      else await usersApi[confirm.type](confirm.user.id)
      setNotice(confirm.type === 'reset' ? 'Password reset successfully.' : 'User updated successfully.')
      setConfirm(null); await load()
    } catch (requestError) { setError(getApiError(requestError).message); setConfirm(null) }
    finally { setBusy(false) }
  }

  const columns = useMemo(() => [
    { key: 'name', label: 'Name', render: (user) => <div><Link className="table-link" to={`/users/${user.id}`}>{user.firstName} {user.lastName}</Link><small>{user.uniqueId}</small></div> },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (user) => user.role === ROLES.EMPLOYEE
      ? <StatusBadge value={user.role} kind="role" />
      : <select className="table-select" value={user.role} aria-label={`Role for ${user.email}`} onChange={(event) => requestAction({ ...user, pendingRole: event.target.value }, 'role')}>{INTERNAL_ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}</select> },
    { key: 'accountStatus', label: 'Status', render: (user) => <StatusBadge value={user.accountStatus} /> },
    { key: 'mustChangePassword', label: 'Password', render: (user) => user.mustChangePassword ? <span className="badge badge--warning">Change required</span> : <span className="muted">Current</span> },
    { key: 'actions', label: 'Actions', render: (user) => <div className="row-actions">{user.role === ROLES.EMPLOYEE
      ? user.employeeId && <Link className="button-link" to={`/employees/${user.employeeId}`}>View employee</Link>
      : <><Link className="button-link" to={`/users/${user.id}`}>Edit</Link><button className="button-link" onClick={() => requestAction(user, user.accountStatus === ACCOUNT_STATUSES.ACTIVE ? 'deactivate' : 'activate')}>{user.accountStatus === ACCOUNT_STATUSES.ACTIVE ? 'Deactivate' : 'Activate'}</button></>}<button className="button-link" onClick={() => requestAction(user, 'reset')}>Reset password</button></div> },
  ], [])

  const visibleUsers = users.filter(
    (user) => String(user.id) !== String(currentUser?.id)
  )

  return <><header className="page-header"><div><p className="eyebrow">Access management</p><h1>Users</h1><p>Manage accounts, roles, access status, and password resets.</p></div><Link className="button" to="/users/new">+ Create user</Link></header>
    {notice && <div className="alert alert--success dismissible">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}<ErrorBanner message={error} />
    <section className="panel"><div className="filters"><input aria-label="Search users" placeholder="Search name, email, or ID" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })} /><select aria-label="Filter by role" value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value, page: 1 })}><option value="">All roles</option>{ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}</select><select aria-label="Filter by status" value={filters.accountStatus} onChange={(event) => setFilters({ ...filters, accountStatus: event.target.value, page: 1 })}><option value="">All statuses</option><option>ACTIVE</option><option>INACTIVE</option></select></div>
      {loading ? <LoadingState label="Loading users…" /> : <><DataTable columns={columns} rows={visibleUsers} emptyMessage="No users match these filters." /><Pagination meta={meta} onPageChange={(page) => setFilters({ ...filters, page })} /></>}
    </section><ConfirmDialog open={Boolean(confirm)} title={confirm?.title} message={confirm?.message} danger={confirm?.type === 'deactivate' || confirm?.type === 'reset'} confirmLabel={confirm?.type === 'role' ? 'Change role' : confirm?.type === 'reset' ? 'Reset password' : confirm?.type === 'deactivate' ? 'Deactivate' : 'Activate'} busy={busy} onCancel={() => setConfirm(null)} onConfirm={runAction} /><TemporaryPasswordDialog result={temporaryResult} title="Password reset successfully" onDone={() => setTemporaryResult(null)} /></>
}
