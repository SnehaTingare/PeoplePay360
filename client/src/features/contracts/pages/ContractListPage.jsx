import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import DataTable from '../../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import Pagination from '../../../shared/components/Pagination/Pagination'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import contractsApi from '../api/contractsApi'
import { employeeLabel, formatDate, formatMoney, recordId, referenceLabel } from '../contractUtils'
import useContractReferences from '../useContractReferences'

export default function ContractListPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const references = useContractReferences()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ employeeId: searchParams.get('employeeId') || '', departmentId: '', salaryStructureId: '', status: '', from: '', to: '', page: 1, limit: 10 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')
  useEffect(() => {
    let active = true
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
    contractsApi.list(params)
      .then((result) => {
        if (!active) return
        setRows(result.data)
        setMeta(result.meta)
        setError('')
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError).message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])
  const columns = useMemo(() => [
    { key: 'employee', label: 'Employee', render: (row) => <Link className="table-link" to={`/contracts/${row.id}`}>{referenceLabel(row.employee, references.employees, employeeLabel)}</Link> },
    { key: 'position', label: 'Position', render: (row) => <div><span>{row.jobPosition}</span><small>{referenceLabel(row.department, references.departments)}</small></div> },
    { key: 'structure', label: 'Salary Structure', render: (row) => referenceLabel(row.salaryStructure, references.structures) },
    { key: 'wage', label: 'Monthly wage', render: (row) => formatMoney(row.wage) },
    { key: 'period', label: 'Period', render: (row) => <div><span>{formatDate(row.startDate)}</span><small>to {formatDate(row.endDate)}</small></div> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row-actions"><Link className="button-link" to={`/contracts/${row.id}`}>View</Link>{row.status === 'DRAFT' && <Link className="button-link" to={`/contracts/${row.id}/edit`}>Edit</Link>}</div> },
  ], [references.departments, references.employees, references.structures])
  const normalized = rows.map((row) => ({ ...row, id: recordId(row) }))
  return <><header className="page-header"><div><p className="eyebrow">HR records</p><h1>Contracts</h1><p>Manage current terms while preserving historical employment Contracts.</p></div><Link className="button" to={`/contracts/new${filters.employeeId ? `?employeeId=${filters.employeeId}` : ''}`}>+ New Contract</Link></header>
    {notice && <div className="alert alert--success dismissible">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}>x</button></div>}<ErrorBanner message={error || references.error} />
    <section className="panel"><div className="contract-filters"><select aria-label="Filter by employee" value={filters.employeeId} onChange={(event) => setFilters({ ...filters, employeeId: event.target.value, page: 1 })}><option value="">All employees</option>{references.employees.map((employee) => <option key={recordId(employee)} value={recordId(employee)}>{employeeLabel(employee)}</option>)}</select><select aria-label="Filter by department" value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value, page: 1 })}><option value="">All departments</option>{references.departments.map((department) => <option key={recordId(department)} value={recordId(department)}>{department.name}</option>)}</select>{references.salaryStructureAccess && <select aria-label="Filter by Salary Structure" value={filters.salaryStructureId} onChange={(event) => setFilters({ ...filters, salaryStructureId: event.target.value, page: 1 })}><option value="">All Salary Structures</option>{references.structures.map((structure) => <option key={recordId(structure)} value={recordId(structure)}>{structure.name}</option>)}</select>}<select aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">All statuses</option>{['DRAFT', 'RUNNING', 'EXPIRED', 'CANCELLED'].map((status) => <option key={status}>{status}</option>)}</select><input aria-label="Contracts active from" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })} /><input aria-label="Contracts active to" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })} /></div>
      {loading || references.loading ? <LoadingState label="Loading Contracts..." /> : <><DataTable columns={columns} rows={normalized} emptyMessage="No Contracts found." /><Pagination meta={meta} onPageChange={(page) => setFilters({ ...filters, page })} /></>}
    </section></>
}
