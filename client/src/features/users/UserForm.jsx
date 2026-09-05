import { useState } from 'react'
import { ROLE_OPTIONS, roleLabel } from '../../shared/constants/roles'
import ErrorBanner from '../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../shared/components/FormField/FormField'

const emptyForm = { firstName: '', lastName: '', email: '', role: 'EMPLOYEE' }

export default function UserForm({ user, onSubmit, onCancel, busy, error, submitLabel }) {
  const [form, setForm] = useState(() => user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } : emptyForm)
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  return <form className="panel form-panel" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
    <ErrorBanner message={error} /><div className="form-grid"><FormField label="First name" htmlFor="firstName"><input id="firstName" name="firstName" required value={form.firstName} onChange={update} /></FormField><FormField label="Last name" htmlFor="lastName"><input id="lastName" name="lastName" required value={form.lastName} onChange={update} /></FormField><FormField label="Email" htmlFor="email"><input id="email" name="email" type="email" required value={form.email} onChange={update} /></FormField>{!user && <FormField label="Role" htmlFor="role"><select id="role" name="role" value={form.role} onChange={update}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></FormField>}</div>
    <div className="form-actions"><button type="button" className="button button--secondary" onClick={onCancel}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div>
  </form>
}
