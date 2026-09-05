import { useEffect, useState } from 'react'
import { getApiError } from '../../../shared/api/apiError'
import DataTable from '../../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import Pagination from '../../../shared/components/Pagination/Pagination'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import { formatDate, formatMoney, recordId } from '../../payruns/payrollUiUtils'
import payslipApi from '../api/payslipApi'

export default function MyPayslipsPage() {
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState(null); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { let active = true; payslipApi.mine({ page, limit: 10 }).then((result) => { if (active) { setRows(result.data); setMeta(result.meta); setError(''); setLoading(false) } }).catch((requestError) => { if (active) { setError(getApiError(requestError).message); setLoading(false) } }); return () => { active = false } }, [page])
  const columns = [{ key: 'period', label: 'Period', render: (row) => `${formatDate(row.periodStart)} - ${formatDate(row.periodEnd)}` }, { key: 'structure', label: 'Salary Structure', render: (row) => row.salaryStructureSnapshot?.name }, { key: 'worked', label: 'Worked Days', render: (row) => row.workedDays }, { key: 'gross', label: 'Gross', render: (row) => formatMoney(row.grossSalary) }, { key: 'deductions', label: 'Deductions', render: (row) => formatMoney(row.totalDeductions) }, { key: 'net', label: 'Net Salary', render: (row) => <strong>{formatMoney(row.netSalary)}</strong> }, { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> }]
  return <><header className="page-header"><div><p className="eyebrow">Employee self-service</p><h1>My Payslips</h1><p>Only your own Paid Payslips are returned by the backend.</p></div></header><ErrorBanner message={error} /><section className="panel">{loading ? <LoadingState label="Loading Payslips..." /> : <><DataTable columns={columns} rows={rows.map((row) => ({ ...row, id: recordId(row) }))} emptyMessage="No Paid Payslips available." /><Pagination meta={meta} onPageChange={(value) => { setLoading(true); setPage(value) }} /></>}</section><p className="detail-note">Employee PDF/detail access is not exposed by the current backend; payroll staff can download final Payslip PDFs.</p></>
}
