import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usersApi } from '.'
import { getApiError } from '../../shared/api/apiError'
import TemporaryPasswordDialog from '../../shared/components/TemporaryPasswordDialog/TemporaryPasswordDialog'
import UserForm from './UserForm'

export default function CreateUserPage() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (form) => {
    setBusy(true); setError('')
    try { setResult(await usersApi.create(form)) }
    catch (requestError) { setError(getApiError(requestError).message) }
    finally { setBusy(false) }
  }
  return <><header className="page-header"><div><p className="eyebrow">User administration</p><h1>Create user</h1><p>Create secure access and assign the initial role.</p></div></header><UserForm onSubmit={submit} onCancel={() => navigate('/users')} busy={busy} error={error} submitLabel="Create user" /><TemporaryPasswordDialog result={result} onDone={() => navigate('/users', { state: { notice: 'User created successfully.' } })} /></>
}
