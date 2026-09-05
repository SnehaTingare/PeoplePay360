import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../app/providers/authContext'
import { getApiError } from '../../../shared/api/apiError'
import DataTable from '../../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import Pagination from '../../../shared/components/Pagination/Pagination'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import { canManageSalaryConfig } from '../../../shared/permissions/permissions'
import salaryConfigApi from '../api/salaryConfigApi'
import { compact, recordId } from '../salaryConfigUtils'

export default function SalaryStructureListPage() {
  const { user } = useAuth(); const canManage = canManageSalaryConfig(user)
  const [rows, setRows] = useState([]); const [counts, setCounts] = useState({}); const [meta, setMeta] = useState(null); const [filters, setFilters] = useState({ q: '', active: '', page: 1, limit: 10 }); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { let active = true; const timer = setTimeout(() => salaryConfigApi.listStructures(compact(filters)).then(async (structures) => { const totals = await Promise.all(structures.data.map((structure) => salaryConfigApi.listRules({ salaryStructureId: recordId(structure), page: 1, limit: 1 }).then((result) => result.meta.total))); if (!active) return; setRows(structures.data); setMeta(structures.meta); setCounts(Object.fromEntries(structures.data.map((structure, index) => [recordId(structure), totals[index]]))); setError(''); setLoading(false) }).catch((requestError) => { if (active) { setError(getApiError(requestError).message); setLoading(false) } }), filters.q ? 300 : 0); return () => { active = false; clearTimeout(timer) } }, [filters])
  const columns = useMemo(() => [{ key: 'name', label: 'Structure', render: (row) => <Link className="table-link" to={`/salary-config/structures/${row.id}`}>{row.name}</Link> }, { key: 'code', label: 'Code', render: (row) => <span className="code-text">{row.code}</span> }, { key: 'rules', label: 'Rules', render: (row) => <Link className="button-link" to={`/salary-config/rules?salaryStructureId=${row.id}`}>{counts[row.id] || 0} rules</Link> }, { key: 'active', label: 'Status', render: (row) => <StatusBadge value={row.active ? 'ACTIVE' : 'INACTIVE'} /> }, { key: 'actions', label: '', render: (row) => <div className="row-actions"><Link className="button-link" to={`/salary-config/structures/${row.id}`}>View</Link>{canManage && <Link className="button-link" to={`/salary-config/structures/${row.id}/edit`}>Edit</Link>}</div> }], [canManage, counts])
  return <><header className="page-header"><div><p className="eyebrow">Payroll configuration</p><h1>Salary Structures</h1><p>Organize Salary Rules without running payroll calculations in the browser.</p></div>{canManage && <Link className="button" to="/salary-config/structures/new">+ New Structure</Link>}</header><ErrorBanner message={error} /><section className="panel"><div className="filters filters--compact"><input aria-label="Search structures" placeholder="Search name or code" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })} /><select aria-label="Filter status" value={filters.active} onChange={(event) => setFilters({ ...filters, active: event.target.value, page: 1 })}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></div>{loading ? <LoadingState label="Loading Salary Structures..." /> : <><DataTable columns={columns} rows={rows.map((row) => ({ ...row, id: recordId(row) }))} emptyMessage="No Salary Structures found." /><Pagination meta={meta} onPageChange={(page) => setFilters({ ...filters, page })} /></>}</section></>
}
