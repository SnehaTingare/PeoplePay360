import { useState } from 'react'
import { ROLES, ROLE_OPTIONS, roleLabel } from '../../shared/constants/roles'
import ErrorBanner from '../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../shared/components/FormField/FormField'
import {
  humanName,
  email as validateEmail,
} from '../../shared/validation/formValidation'

const INTERNAL_ROLE_OPTIONS = ROLE_OPTIONS.filter((role) => role !== ROLES.EMPLOYEE)
const emptyForm = { firstName: '', lastName: '', email: '', role: ROLES.HR_MANAGER }

export default function UserForm({ user, onSubmit, onCancel, busy, error, submitLabel }) {
  const [form, setForm] = useState(() => user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } : emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = (event) => {
    event.preventDefault()
    const next = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
    }
    const errors = {
      firstName: humanName(next.firstName, 'First name'),
      lastName: humanName(next.lastName, 'Last name'),
      email: validateEmail(next.email),
    }
    setFieldErrors(errors)
    if (Object.values(errors).some(Boolean)) {
      return
    }
    setForm(next)
    onSubmit(next)
  }
  return <form className="panel form-panel" onSubmit={submit}>
    <ErrorBanner message={error} /><div className="form-grid"><FormField label="First name" htmlFor="firstName" error={fieldErrors.firstName}><input id="firstName" name="firstName" required value={form.firstName} onChange={update} /></FormField><FormField label="Last name" htmlFor="lastName" error={fieldErrors.lastName}><input id="lastName" name="lastName" required value={form.lastName} onChange={update} /></FormField><FormField label="Email" htmlFor="email" error={fieldErrors.email}><input id="email" name="email" type="email" required value={form.email} onChange={update} /></FormField>{!user && <FormField label="Role" htmlFor="role" hint="Employee login accounts are created through Employee onboarding."><select id="role" name="role" value={form.role} onChange={update}>{INTERNAL_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></FormField>}</div>
    <div className="form-actions"><button type="button" className="button button--secondary" onClick={onCancel}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div>
  </form>
}
