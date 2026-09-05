import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usersApi } from '.'
import { getApiError } from '../../shared/api/apiError'
import LoadingState from '../../shared/components/LoadingState/LoadingState'
import StatusBadge from '../../shared/components/StatusBadge/StatusBadge'
import { ROLES } from '../../shared/constants/roles'
import UserForm from './UserForm'

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { usersApi.get(id).then(setUser).catch((requestError) => setError(getApiError(requestError).message)) }, [id])
  const submit = async ({ firstName, lastName, email }) => {
    setBusy(true); setError('')
    try { setUser(await usersApi.update(id, { firstName, lastName, email })); navigate('/users', { state: { notice: 'User profile updated.' } }) }
    catch (requestError) { setError(getApiError(requestError).message) }
    finally { setBusy(false) }
  }
  if (!user && !error) return <LoadingState label="Loading user…" />
  if (!user) return <section className="center-message"><h1>Unable to load user</h1><p>{error}</p><Link to="/users" className="button">Back to users</Link></section>
  if (user.role === ROLES.EMPLOYEE) return <><header className="page-header"><div><p className="eyebrow">{user.uniqueId}</p><h1>{user.firstName} {user.lastName}</h1><div className="badge-row"><StatusBadge value={user.role} kind="role" /><StatusBadge value={user.accountStatus} /></div></div><Link className="button button--secondary" to="/users">Back to users</Link></header><section className="panel form-panel"><h2>Employee-managed account</h2><p className="muted">This login account is managed through its linked Employee record so profile and account status stay consistent.</p>{user.employeeId ? <Link className="button" to={`/employees/${user.employeeId}`}>View employee</Link> : <div className="alert alert--warning">This legacy Employee account has no linked Employee record.</div>}</section></>
  return <><header className="page-header"><div><p className="eyebrow">{user.uniqueId}</p><h1>{user.firstName} {user.lastName}</h1><div className="badge-row"><StatusBadge value={user.role} kind="role" /><StatusBadge value={user.accountStatus} /></div></div></header><UserForm user={user} onSubmit={submit} onCancel={() => navigate('/users')} busy={busy} error={error} submitLabel="Save changes" /></>
}
