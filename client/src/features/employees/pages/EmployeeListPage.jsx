import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import ConfirmDialog from '../../../shared/components/ConfirmDialog/ConfirmDialog'
import DataTable from '../../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import Pagination from '../../../shared/components/Pagination/Pagination'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import employeesApi from '../api/employeesApi'
import { recordId, referenceLabel } from '../employeeUtils'
import useEmployeeReferences from '../useEmployeeReferences'

export default function EmployeeListPage() {
  const location = useLocation()
  const references = useEmployeeReferences()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ q: '', departmentId: '', employeeType: '', employmentStatus: '', managerId: '', page: 1, limit: 10 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')
  const [action, setAction] = useState(null)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('kanban')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const result = await employeesApi.list(params)
      setRows(result.data); setMeta(result.meta)
    } catch (requestError) { setError(getApiError(requestError).message) }
    finally { setLoading(false) }
  }, [filters])
  useEffect(() => { const timer = setTimeout(load, filters.q ? 300 : 0); return () => clearTimeout(timer) }, [load, filters.q])

  const changeStatus = async () => {
    setBusy(true); setError('')
    try { await employeesApi[action.type](recordId(action.employee)); setAction(null); setNotice(`Employee ${action.type}d successfully.`); await load() }
    catch (requestError) { setError(getApiError(requestError).message); setAction(null) }
    finally { setBusy(false) }
  }
  const columns = useMemo(() => [
    { key: 'employeeId', label: 'Employee ID', render: (row) => <span className="code-text">{row.employeeId}</span> },
    { key: 'name', label: 'Name', render: (row) => <div><Link className="table-link" to={`/employees/${row.id}`}>{row.firstName} {row.lastName}</Link><small>{row.email}</small></div> },
    { key: 'department', label: 'Department', render: (row) => referenceLabel(row.department, references.departments) },
    { key: 'jobPosition', label: 'Position' },
    { key: 'employeeType', label: 'Type', render: (row) => <span className="badge badge--role">{row.employeeType}</span> },
    { key: 'workingSchedule', label: 'Schedule', render: (row) => referenceLabel(row.workingSchedule, references.schedules) },
    { key: 'employmentStatus', label: 'Status', render: (row) => <StatusBadge value={row.employmentStatus} /> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row-actions"><Link className="button-link" to={`/employees/${row.id}`}>View</Link><Link className="button-link" to={`/employees/${row.id}/edit`}>Edit</Link><button className={`button-link ${row.employmentStatus === 'ACTIVE' ? 'button-link--danger' : ''}`} onClick={() => setAction({ employee: row, type: row.employmentStatus === 'ACTIVE' ? 'deactivate' : 'activate' })}>{row.employmentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></div> },
  ], [references.departments, references.schedules])

  const normalizedRows = rows.map((row) => ({ ...row, id: recordId(row) }))
  const employeeKanban = normalizedRows.length
    ? <div className="employee-kanban">{normalizedRows.map((row) => <article className="employee-card" key={row.id}><div className="employee-card-top"><span className="employee-avatar">{row.firstName?.[0]}{row.lastName?.[0]}</span><div><Link className="employee-card-name" to={`/employees/${row.id}`}>{row.firstName} {row.lastName}</Link><small>{row.jobPosition}</small></div></div><div className="employee-card-meta"><span>{referenceLabel(row.department, references.departments)}</span><StatusBadge value={row.employmentStatus} /></div><div className="employee-card-actions"><Link className="button-link" to={`/employees/${row.id}`}>View</Link><Link className="button-link" to={`/employees/${row.id}/edit`}>Edit</Link></div></article>)}</div>
    : <p className="empty-workspace">No employees found.</p>
  const employeeView = view === 'kanban' ? employeeKanban : <DataTable columns={columns} rows={normalizedRows} emptyMessage="No employees found." />
  return <><header className="page-header"><div><p className="eyebrow">HR records</p><h1>Employees</h1><p>Manage central employee records and employment information.</p></div><Link className="button" to="/employees/new">+ New employee</Link></header>
    {notice && <div className="alert alert--success dismissible">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}>×</button></div>}<ErrorBanner message={error || references.error} />
    <section className="panel"><div className="employee-filters"><input aria-label="Search employees" placeholder="Search name, email, or employee ID" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })} /><select aria-label="Filter by department" value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value, page: 1 })}><option value="">All departments</option>{references.departments.map((department) => <option key={recordId(department)} value={recordId(department)}>{department.name}</option>)}</select><select aria-label="Filter by manager" value={filters.managerId} onChange={(event) => setFilters({ ...filters, managerId: event.target.value, page: 1 })}><option value="">All managers</option>{references.managers.map((manager) => <option key={recordId(manager)} value={recordId(manager)}>{manager.firstName} {manager.lastName}</option>)}</select><select aria-label="Filter by status" value={filters.employmentStatus} onChange={(event) => setFilters({ ...filters, employmentStatus: event.target.value, page: 1 })}><option value="">All statuses</option><option>ACTIVE</option><option>INACTIVE</option></select></div>
      <div className="employee-view-toolbar"><span>View: {view === 'kanban' ? 'Kanban' : 'List'}</span><div className="view-toggle" role="group" aria-label="Employee view"><button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>Kanban</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button></div></div>
      {loading ? <LoadingState label="Loading employees…" /> : <>{employeeView}<Pagination meta={meta} onPageChange={(page) => setFilters({ ...filters, page })} /></>}
    </section><ConfirmDialog open={Boolean(action)} title={`${action?.type === 'deactivate' ? 'Deactivate' : 'Activate'} this employee?`} message={`${action?.employee?.firstName || 'This employee'} ${action?.employee?.lastName || ''} will be marked ${action?.type === 'deactivate' ? 'inactive and excluded from normal future payroll eligibility' : 'active'}. Historical records remain unchanged.`} confirmLabel={action?.type === 'deactivate' ? 'Deactivate' : 'Activate'} danger={action?.type === 'deactivate'} busy={busy} onCancel={() => setAction(null)} onConfirm={changeStatus} /></>
}
