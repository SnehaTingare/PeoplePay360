import { useState } from 'react'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'

const initialValues = (department) => ({
  name: department?.name || '',
  code: department?.code || '',
  description: department?.description || '',
  managerId: department?.manager?.id || department?.manager?._id || department?.manager || '',
})

export default function DepartmentForm({ department, error, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initialValues(department))
  const [fieldError, setFieldError] = useState('')
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.code.trim()) return setFieldError('Name and code are required.')
    setFieldError('')
    onSubmit({ name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description.trim(), managerId: form.managerId.trim() || null })
  }

  return <form className="panel form-panel" onSubmit={submit}>
    <ErrorBanner message={fieldError || error} />
    <div className="form-grid">
      <FormField label="Name *" htmlFor="department-name"><input id="department-name" name="name" required value={form.name} onChange={update} placeholder="Engineering" /></FormField>
      <FormField label="Code *" htmlFor="department-code" hint="Uppercase letters, numbers, and underscores."><input id="department-code" name="code" required value={form.code} onChange={update} placeholder="ENG" /></FormField>
      <div className="form-grid-span"><FormField label="Description" htmlFor="department-description"><textarea id="department-description" name="description" rows="4" maxLength="2000" value={form.description} onChange={update} placeholder="Describe this department’s purpose." /></FormField></div>
      <div className="form-grid-span"><FormField label="Manager employee ID" htmlFor="department-manager" hint="Optional MongoDB employee identifier. Clear this field to remove the manager."><input id="department-manager" name="managerId" value={form.managerId} onChange={update} placeholder="Optional employee ID" /></FormField></div>
    </div>
    <div className="form-actions"><button type="button" className="button button--secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving…' : department ? 'Save changes' : 'Create department'}</button></div>
  </form>
}
