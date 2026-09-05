import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import ConfirmDialog from '../../../shared/components/ConfirmDialog/ConfirmDialog'
import DataTable from '../../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import Pagination from '../../../shared/components/Pagination/Pagination'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import departmentsApi from '../api/departmentsApi'

export default function DepartmentListPage() {
  const location = useLocation()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ q: '', active: '', page: 1, limit: 10 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const result = await departmentsApi.list(params)
      setRows(result.data); setMeta(result.meta)
    } catch (requestError) { setError(getApiError(requestError).message) }
    finally { setLoading(false) }
  }, [filters])
  useEffect(() => { const timer = setTimeout(load, filters.q ? 300 : 0); return () => clearTimeout(timer) }, [load, filters.q])

  const deactivate = async () => {
    setBusy(true); setError('')
    try { await departmentsApi.deactivate(selected.id || selected._id); setSelected(null); setNotice('Department deactivated successfully.'); await load() }
    catch (requestError) { setError(getApiError(requestError).message); setSelected(null) }
    finally { setBusy(false) }
  }
  const columns = useMemo(() => [
    { key: 'name', label: 'Name', render: (row) => <Link className="table-link" to={`/departments/${row.id}/edit`}>{row.name}</Link> },
    { key: 'code', label: 'Code', render: (row) => <span className="code-text">{row.code}</span> },
    { key: 'manager', label: 'Manager', render: (row) => row.manager ? <span title={typeof row.manager === 'string' ? row.manager : row.manager.id || row.manager._id}>{typeof row.manager === 'object' && row.manager.firstName ? `${row.manager.firstName} ${row.manager.lastName}` : 'Assigned'}</span> : <span className="muted">Not assigned</span> },
    { key: 'active', label: 'Status', render: (row) => <StatusBadge value={row.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row-actions"><Link className="button-link" to={`/departments/${row.id}/edit`}>Edit</Link>{row.active && <button className="button-link button-link--danger" onClick={() => setSelected(row)}>Deactivate</button>}</div> },
  ], [])

  const normalizedRows = rows.map((row) => ({ ...row, id: row.id || row._id }))
  return <><header className="page-header"><div><p className="eyebrow">HR configuration</p><h1>Departments</h1><p>Organize teams and maintain active department records.</p></div><Link className="button" to="/departments/new">+ New department</Link></header>
    {notice && <div className="alert alert--success dismissible">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}>×</button></div>}<ErrorBanner message={error} />
    <section className="panel"><div className="filters filters--compact"><input aria-label="Search departments" placeholder="Search name or code" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })} /><select aria-label="Filter by status" value={filters.active} onChange={(event) => setFilters({ ...filters, active: event.target.value, page: 1 })}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
      {loading ? <LoadingState label="Loading departments…" /> : <><DataTable columns={columns} rows={normalizedRows} emptyMessage="No departments found." /><Pagination meta={meta} onPageChange={(page) => setFilters({ ...filters, page })} /></>}
    </section><ConfirmDialog open={Boolean(selected)} title="Deactivate this department?" message={`${selected?.name || 'This department'} will remain available in historical records but cannot be used as an active department.`} confirmLabel="Deactivate" danger busy={busy} onCancel={() => setSelected(null)} onConfirm={deactivate} /></>
}
