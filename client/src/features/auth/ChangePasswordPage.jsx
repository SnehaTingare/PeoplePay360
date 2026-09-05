import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '.'
import { useAuth } from '../../app/providers/authContext'
import { getApiError } from '../../shared/api/apiError'
import ErrorBanner from '../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../shared/components/FormField/FormField'

export default function ChangePasswordPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault(); setError(''); setSuccess('')
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.')
    if (form.newPassword !== form.confirmation) return setError('New password and confirmation must match.')
    setBusy(true)
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      const currentUser = await refreshUser()
      if (currentUser.mustChangePassword) throw new Error('Password status was not updated.')
      setSuccess('Password changed successfully. Redirecting…')
      setTimeout(() => navigate('/', { replace: true }), 500)
    } catch (requestError) { setError(getApiError(requestError, requestError.message).message) }
    finally { setBusy(false) }
  }

  return <div className="auth-card"><div className="brand brand--auth"><span className="brand-mark">P</span><div><strong>PeoplePay360</strong><small>Account security</small></div></div><div className="auth-heading"><h1>Change your password</h1><p>{user.mustChangePassword ? 'Set a new password before accessing your workspace.' : 'Update the password used for your account.'}</p></div>
    <ErrorBanner message={error} />{success && <div className="alert alert--success">{success}</div>}
    <form onSubmit={submit} className="stack"><FormField label="Current password" htmlFor="currentPassword"><input id="currentPassword" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></FormField><FormField label="New password" hint="Use at least 8 characters." htmlFor="newPassword"><input id="newPassword" type="password" autoComplete="new-password" minLength="8" required value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /></FormField><FormField label="Confirm new password" htmlFor="confirmation"><input id="confirmation" type="password" autoComplete="new-password" minLength="8" required value={form.confirmation} onChange={(event) => setForm({ ...form, confirmation: event.target.value })} /></FormField><button className="button button--full" disabled={busy}>{busy ? 'Changing password…' : 'Change password'}</button></form>
    <button className="button-link auth-logout" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Sign out</button>
  </div>
}
