import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/authContext'
import { getApiError } from '../../../shared/api/apiError'
import DataTable from '../../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import Pagination from '../../../shared/components/Pagination/Pagination'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import { ROLES } from '../../../shared/constants/roles'
import { optionalText } from '../../../shared/validation/formValidation'
import employeesApi from '../../employees/api/employeesApi'
import { compact, employeeLabel, formatDate, formatDateTime, recordId, referenceLabel } from '../../timeOff/timeOffUtils'
import attendanceApi from '../api/attendanceApi'

const statuses = ['OPEN', 'PRESENT', 'LATE', 'OVERTIME', 'ABSENT', 'MISSING_CHECKOUT']
const blankManual = { employeeId: '', checkIn: '', checkOut: '', notes: '' }

export default function AttendancePage() {
  const { user } = useAuth()
  const employeeView = user.role === ROLES.EMPLOYEE
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ employeeId: searchParams.get('employeeId') || '', departmentId: '', status: '', from: '', to: '', page: 1, limit: 10 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [manual, setManual] = useState(null)

  const load = () => {
    const query = compact(employeeView ? { status: filters.status, from: filters.from, to: filters.to, page: filters.page, limit: filters.limit } : filters)
    return (employeeView ? attendanceApi.mine(query) : attendanceApi.list(query)).then((result) => { setRows(result.data); setMeta(result.meta) })
  }
  useEffect(() => {
    let active = true
    const requests = [employeeView ? Promise.resolve({ data: [] }) : employeesApi.list({ page: 1, limit: 100 }), employeeView ? attendanceApi.mine(compact(filters)) : attendanceApi.list(compact(filters))]
    Promise.all(requests).then(([employeeResult, attendanceResult]) => {
      if (!active) return
      setEmployees(employeeResult.data); setRows(attendanceResult.data); setMeta(attendanceResult.meta); setError(''); setLoading(false)
    }).catch((requestError) => { if (active) { setError(getApiError(requestError).message); setLoading(false) } })
    return () => { active = false }
  }, [employeeView, filters])

  const clock = async (action) => {
    setBusy(action); setError('')
    try { await attendanceApi[action](); await load() } catch (requestError) { setError(getApiError(requestError).message) }
    finally { setBusy('') }
  }
  const createManual = async (event) => {
    event.preventDefault(); setBusy('manual'); setError('')
    if (manual.checkIn && manual.checkOut && new Date(manual.checkOut).getTime() <= new Date(manual.checkIn).getTime()) {
      setError('Check-out must be later than check-in.'); setBusy(''); return
    }
    const notesError = optionalText(manual.notes, 'Notes', 2000)
    if (notesError) {
      setError(notesError); setBusy(''); return
    }
    try { await attendanceApi.create({ ...manual, checkOut: manual.checkOut || undefined, notes: manual.notes.trim() }); setManual(null); await load() }
    catch (requestError) { setError(getApiError(requestError).message) }
    finally { setBusy('') }
  }
  const columns = useMemo(() => [
    ...(!employeeView ? [{ key: 'employee', label: 'Employee', render: (row) => referenceLabel(row.employee, employees, employeeLabel) }] : []),
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'checkIn', label: 'Check in', render: (row) => formatDateTime(row.checkIn) },
    { key: 'checkOut', label: 'Check out', render: (row) => formatDateTime(row.checkOut) },
    { key: 'hours', label: 'Worked', render: (row) => `${Number(row.workedHours || 0).toFixed(2)} hours` },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'actions', label: '', render: (row) => <Link className="button-link" to={`/attendance/${recordId(row)}`}>View</Link> },
  ], [employeeView, employees])
  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value, page: 1 }))

  return <><header className="page-header"><div><p className="eyebrow">Attendance</p><h1>{employeeView ? 'My Attendance' : 'Attendance'}</h1><p>{employeeView ? 'Clock in, clock out, and review your attendance history.' : 'Review attendance and correct records using backend-derived status and worked hours.'}</p></div><div className="header-actions">{employeeView ? <><button className="button" disabled={Boolean(busy)} onClick={() => clock('checkIn')}>{busy === 'checkIn' ? 'Checking in...' : 'Check In'}</button><button className="button button--secondary" disabled={Boolean(busy)} onClick={() => clock('checkOut')}>{busy === 'checkOut' ? 'Checking out...' : 'Check Out'}</button></> : <button className="button" onClick={() => setManual({ ...blankManual })}>+ Manual Attendance</button>}</div></header><ErrorBanner message={error} />
    {!employeeView && manual && <form className="panel inline-form" onSubmit={createManual}><h2>Manual attendance</h2><div className="form-grid"><FormField label="Employee *"><select required value={manual.employeeId} onChange={(event) => setManual({ ...manual, employeeId: event.target.value })}><option value="">Select employee</option>{employees.map((employee) => <option key={recordId(employee)} value={recordId(employee)}>{employeeLabel(employee)} ({employee.employeeId})</option>)}</select></FormField><FormField label="Check in *"><input required type="datetime-local" value={manual.checkIn} onChange={(event) => setManual({ ...manual, checkIn: event.target.value })} /></FormField><FormField label="Check out"><input type="datetime-local" value={manual.checkOut} onChange={(event) => setManual({ ...manual, checkOut: event.target.value })} /></FormField><FormField label="Notes"><textarea rows="2" maxLength={2000} value={manual.notes} onChange={(event) => setManual({ ...manual, notes: event.target.value })} /></FormField></div><div className="form-actions"><button type="button" className="button button--secondary" onClick={() => setManual(null)}>Cancel</button><button className="button" disabled={busy === 'manual'}>{busy === 'manual' ? 'Saving...' : 'Create'}</button></div></form>}
    <section className="panel"><div className="operation-filters">{!employeeView && <select aria-label="Filter employee" value={filters.employeeId} onChange={(event) => updateFilter('employeeId', event.target.value)}><option value="">All employees</option>{employees.map((employee) => <option key={recordId(employee)} value={recordId(employee)}>{employeeLabel(employee)}</option>)}</select>}<select aria-label="Filter status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><input aria-label="From date" type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} /><input aria-label="To date" type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} /></div>{loading ? <LoadingState label="Loading attendance..." /> : <><DataTable columns={columns} rows={rows.map((row) => ({ ...row, id: recordId(row) }))} emptyMessage="No attendance records found." /><Pagination meta={meta} onPageChange={(page) => setFilters({ ...filters, page })} /></>}</section></>
}
