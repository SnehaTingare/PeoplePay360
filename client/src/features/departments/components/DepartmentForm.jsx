import { useState } from 'react'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import {
  requiredText,
  optionalText,
  code as validateCode,
  optionExists,
} from '../../../shared/validation/formValidation'
import { recordId } from '../../timeOff/timeOffUtils'

const initialValues = (department) => ({
  name: department?.name || '',
  code: department?.code || '',
  description: department?.description || '',
  managerId: department?.manager?.id || department?.manager?._id || department?.manager || '',
})

export default function DepartmentForm({ department, managerOptions = [], error, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initialValues(department))
  const [fieldError, setFieldError] = useState('')
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const code = form.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '')
    const description = form.description.trim()
    const managerId = form.managerId.trim()
    const errors = {
      name: requiredText(name, 'Department name'),
      code: validateCode(code, 'Department code'),
      description: optionalText(description, 'Description', 2000),
      managerId: optionExists(managerId, managerOptions, (option) => recordId(option), 'Manager', false),
    }
    const nextError = Object.values(errors).find(Boolean)
    if (nextError) return setFieldError(nextError)
    setFieldError('')
    onSubmit({ name, code, description, managerId: managerId || null })
  }

  return <form className="panel form-panel" onSubmit={submit}>
    <ErrorBanner message={fieldError || error} />
    <div className="form-grid">
      <FormField label="Name *" htmlFor="department-name" error={fieldError && fieldError === requiredText(form.name.trim(), 'Department name') ? requiredText(form.name.trim(), 'Department name') : ''}><input id="department-name" name="name" required value={form.name} onChange={update} placeholder="Engineering" /></FormField>
      <FormField label="Code *" htmlFor="department-code" hint="Uppercase letters, numbers, and underscores." error={fieldError && fieldError === validateCode(form.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, ''), 'Department code') ? validateCode(form.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, ''), 'Department code') : ''}><input id="department-code" name="code" required value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))} placeholder="ENG" /></FormField>
      <div className="form-grid-span"><FormField label="Description" htmlFor="department-description" error={fieldError && fieldError === optionalText(form.description.trim(), 'Description', 2000) ? optionalText(form.description.trim(), 'Description', 2000) : ''}><textarea id="department-description" name="description" rows="4" maxLength="2000" value={form.description} onChange={update} placeholder="Describe this department’s purpose." /></FormField></div>
      <div className="form-grid-span"><FormField label="Manager" htmlFor="department-manager" hint="Clear this field to remove the manager." error={fieldError && fieldError === optionExists(form.managerId.trim(), managerOptions, (option) => recordId(option), 'Manager', false) ? optionExists(form.managerId.trim(), managerOptions, (option) => recordId(option), 'Manager', false) : ''}><select id="department-manager" name="managerId" value={form.managerId} onChange={update}><option value="">No manager</option>{managerOptions.map((employee) => <option key={recordId(employee)} value={recordId(employee)}>{employee.firstName} {employee.lastName}</option>)}</select></FormField></div>
    </div>
    <div className="form-actions"><button type="button" className="button button--secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving…' : department ? 'Save changes' : 'Create department'}</button></div>
  </form>
}
