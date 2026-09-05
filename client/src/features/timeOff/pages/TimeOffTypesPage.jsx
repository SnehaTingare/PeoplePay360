import { useEffect, useState } from 'react'
import { getApiError } from '../../../shared/api/apiError'
import DataTable from '../../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import { timeOffTypesApi } from '../api/timeOffApi'
import { recordId } from '../timeOffUtils'

const blank = { name: '', code: '', description: '', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, isPaid: true, payrollTreatment: 'PAID' }
export default function TimeOffTypesPage() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [form, setForm] = useState(null); const [busy, setBusy] = useState(false)
  const load = () => timeOffTypesApi.list({}).then((result) => setRows(result.data))
  useEffect(() => { load().catch((requestError) => setError(getApiError(requestError).message)).finally(() => setLoading(false)) }, [])
  const edit = (row) => setForm({ ...blank, ...row, id: recordId(row) })
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { const { id, active, createdAt, updatedAt, _id, __v, ...payload } = form; void active; void createdAt; void updatedAt; void _id; void __v; if (id) await timeOffTypesApi.update(id, payload); else await timeOffTypesApi.create(payload); setForm(null); await load() } catch (requestError) { setError(getApiError(requestError).message) } finally { setBusy(false) } }
  const deactivate = async (id) => { setBusy(id); setError(''); try { await timeOffTypesApi.deactivate(id); await load() } catch (requestError) { setError(getApiError(requestError).message) } finally { setBusy(false) } }
  const columns = [
    { key: 'name', label: 'Type', render: (row) => <div><strong>{row.name}</strong><small>{row.code}</small></div> }, { key: 'unit', label: 'Unit' },
    { key: 'allocation', label: 'Allocation', render: (row) => row.requiresAllocation ? 'Required' : 'Not required' }, { key: 'approval', label: 'Approval', render: (row) => row.requiresApproval ? 'Required' : 'Not required' },
    { key: 'payroll', label: 'Payroll', render: (row) => row.payrollTreatment }, { key: 'active', label: 'Status', render: (row) => <StatusBadge value={row.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'actions', label: '', render: (row) => <div className="row-actions"><button className="button-link" onClick={() => edit(row)}>Edit</button>{row.active && <button className="button-link button-link--danger" disabled={busy === row.id} onClick={() => deactivate(row.id)}>Deactivate</button>}</div> },
  ]
  return <><header className="page-header"><div><p className="eyebrow">Time Off</p><h1>Time Off Types</h1><p>Configure leave policy; historical policy changes remain backend-protected.</p></div><button className="button" onClick={() => setForm({ ...blank })}>+ New Type</button></header><ErrorBanner message={error} />
    {form && <form className="panel inline-form" onSubmit={submit}><h2>{form.id ? 'Edit' : 'New'} Time Off Type</h2><div className="form-grid"><FormField label="Name *"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField><FormField label="Code *"><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></FormField><FormField label="Unit *"><select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}><option>DAYS</option><option>HOURS</option></select></FormField><FormField label="Payroll treatment *"><select value={form.payrollTreatment} onChange={(event) => setForm({ ...form, payrollTreatment: event.target.value })}><option>NONE</option><option>PAID</option><option>UNPAID_DEDUCTION</option></select></FormField><FormField label="Description"><textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField><div className="check-grid"><label className="checkbox-row"><input type="checkbox" checked={form.requiresAllocation} onChange={(event) => setForm({ ...form, requiresAllocation: event.target.checked })} /> Requires allocation</label><label className="checkbox-row"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} /> Requires approval</label><label className="checkbox-row"><input type="checkbox" checked={form.isPaid} onChange={(event) => setForm({ ...form, isPaid: event.target.checked })} /> Paid leave</label></div></div><div className="form-actions"><button type="button" className="button button--secondary" onClick={() => setForm(null)}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving...' : 'Save Type'}</button></div></form>}
    <section className="panel">{loading ? <LoadingState label="Loading Time Off Types..." /> : <DataTable columns={columns} rows={rows.map((row) => ({ ...row, id: recordId(row) }))} emptyMessage="No Time Off Types found." />}</section></>
}
