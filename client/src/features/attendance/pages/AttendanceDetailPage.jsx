import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/authContext'
import { getApiError } from '../../../shared/api/apiError'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import { canManageHrOperations } from '../../../shared/permissions/permissions'
import { formatDate, formatDateTime } from '../../timeOff/timeOffUtils'
import attendanceApi from '../api/attendanceApi'

const localDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : ''
function Item({ label, children }) { return <div className="detail-item"><dt>{label}</dt><dd>{children || 'Not available'}</dd></div> }

export default function AttendanceDetailPage() {
  const { id } = useParams(); const { user } = useAuth(); const canCorrect = canManageHrOperations(user)
  const [record, setRecord] = useState(null); const [error, setError] = useState(''); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ checkIn: '', checkOut: '', notes: '', correctionReason: '' })
  useEffect(() => { attendanceApi.get(id).then(setRecord).catch((requestError) => setError(getApiError(requestError).message)) }, [id])
  const begin = () => { setForm({ checkIn: localDateTime(record.checkIn), checkOut: localDateTime(record.checkOut), notes: record.notes || '', correctionReason: '' }); setEditing(true) }
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try { const saved = await attendanceApi.correct(id, { checkIn: form.checkIn, ...(form.checkOut ? { checkOut: form.checkOut } : {}), notes: form.notes, correctionReason: form.correctionReason }); setRecord(saved); setEditing(false) }
    catch (requestError) { setError(getApiError(requestError).message) } finally { setBusy(false) }
  }
  if (!record && !error) return <LoadingState label="Loading attendance record..." />
  if (!record) return <section className="center-message"><h1>Unable to load attendance</h1><p>{error}</p><Link className="button" to="/attendance">Back</Link></section>
  return <><ErrorBanner message={error} /><header className="page-header"><div><p className="eyebrow">Attendance / {formatDate(record.date)}</p><h1>Attendance Detail</h1><StatusBadge value={record.status} /></div><div className="header-actions"><Link className="button button--secondary" to="/attendance">Back</Link>{canCorrect && !editing && <button className="button" onClick={begin}>Correct Attendance</button>}</div></header>
    {editing ? <form className="panel inline-form" onSubmit={save}><h2>Correction</h2><div className="form-grid"><FormField label="Check in *"><input required type="datetime-local" value={form.checkIn} onChange={(event) => setForm({ ...form, checkIn: event.target.value })} /></FormField><FormField label="Check out"><input type="datetime-local" value={form.checkOut} onChange={(event) => setForm({ ...form, checkOut: event.target.value })} /></FormField><FormField label="Notes"><textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></FormField><FormField label="Correction reason *"><textarea required rows="3" value={form.correctionReason} onChange={(event) => setForm({ ...form, correctionReason: event.target.value })} /></FormField></div><div className="form-actions"><button type="button" className="button button--secondary" onClick={() => setEditing(false)}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving...' : 'Save correction'}</button></div></form> : <section className="panel detail-section"><dl><Item label="Date">{formatDate(record.date)}</Item><Item label="Check in">{formatDateTime(record.checkIn)}</Item><Item label="Check out">{formatDateTime(record.checkOut)}</Item><Item label="Worked hours">{Number(record.workedHours || 0).toFixed(2)}</Item><Item label="Manual edit">{record.manualEdit ? 'Yes' : 'No'}</Item><Item label="Notes">{record.notes}</Item><Item label="Correction reason">{record.correctionReason}</Item></dl></section>}
  </>
}
