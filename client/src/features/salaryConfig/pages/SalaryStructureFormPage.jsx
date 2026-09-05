import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import { requiredText, optionalText, code as validateCode } from '../../../shared/validation/formValidation'
import salaryConfigApi from '../api/salaryConfigApi'
import { recordId } from '../salaryConfigUtils'

export default function SalaryStructureFormPage() {
  const { id } = useParams(); const editing = Boolean(id); const navigate = useNavigate(); const [form, setForm] = useState({ name: '', code: '', description: '' }); const [loading, setLoading] = useState(editing); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  useEffect(() => { if (!editing) return; salaryConfigApi.getStructure(id).then((value) => setForm({ name: value.name, code: value.code, description: value.description || '' })).catch((requestError) => setError(getApiError(requestError).message)).finally(() => setLoading(false)) }, [editing, id])
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); const nameError = requiredText(form.name, 'Name'); const codeError = validateCode(form.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, ''), 'Code'); const descriptionError = optionalText(form.description, 'Description', 2000); if (nameError || codeError || descriptionError) { setError(nameError || codeError || descriptionError); setBusy(false); return } const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, ''), description: form.description.trim() }; try { const saved = editing ? await salaryConfigApi.updateStructure(id, payload) : await salaryConfigApi.createStructure(payload); navigate(`/salary-config/structures/${recordId(saved)}`) } catch (requestError) { setError(getApiError(requestError).message) } finally { setBusy(false) } }
  if (loading) return <LoadingState label="Loading Salary Structure..." />
  return <><header className="page-header"><div><p className="eyebrow">Payroll configuration</p><h1>{editing ? 'Edit' : 'New'} Salary Structure</h1></div></header><form className="panel form-panel" onSubmit={submit}><ErrorBanner message={error} /><div className="form-grid"><FormField label="Name *"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField><FormField label="Code *"><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></FormField><FormField label="Description"><textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField></div><div className="form-actions"><Link className="button button--secondary" to={editing ? `/salary-config/structures/${id}` : '/salary-config/structures'}>Cancel</Link><button className="button" disabled={busy}>{busy ? 'Saving...' : 'Save Structure'}</button></div></form></>
}
