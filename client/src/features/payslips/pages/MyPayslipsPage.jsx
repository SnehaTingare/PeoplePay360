import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import DataTable from '../../../shared/components/DataTable/DataTable'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import Pagination from '../../../shared/components/Pagination/Pagination'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import { formatDate, formatMoney, recordId } from '../../payruns/payrollUiUtils'
import payslipApi, { downloadPayslipPdf } from '../api/payslipApi'

export default function MyPayslipsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    payslipApi.mine({ page, limit: 10 })
      .then((result) => {
        if (active) {
          setRows(result.data)
          setMeta(result.meta)
          setError('')
          setLoading(false)
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getApiError(requestError).message)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [page])

  const download = async (row) => {
    const id = recordId(row)
    setDownloading(id)
    setError('')
    try {
      await downloadPayslipPdf(id)
    } catch (requestError) {
      setError(getApiError(requestError).message)
    } finally {
      setDownloading('')
    }
  }

  const columns = [
    { key: 'payrun', label: 'Payrun', render: row => row.payrunSummary?.name || 'Payroll' },
    { key: 'period', label: 'Period', render: row => `${formatDate(row.periodStart)} - ${formatDate(row.periodEnd)}` },
    { key: 'structure', label: 'Salary Structure', render: row => row.salaryStructureSnapshot?.name },
    { key: 'worked', label: 'Worked Days', render: row => row.workedDays },
    { key: 'net', label: 'Net Salary', render: row => <strong>{formatMoney(row.netSalary)}</strong> },
    { key: 'status', label: 'Status', render: row => <StatusBadge value={row.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: row => <div className="row-actions">
        <Link className="button-link" to={`/my-payslips/${recordId(row)}`}>View</Link>
        <button className="button-link" disabled={downloading === recordId(row)} onClick={() => download(row)} type="button">
          {downloading === recordId(row) ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>,
    },
  ]

  return <>
    <header className="page-header">
      <div>
        <p className="eyebrow">Employee self-service</p>
        <h1>My Payslips</h1>
        <p>View your Paid Payslips by Payrun and download the official PDF.</p>
      </div>
    </header>
    <ErrorBanner message={error} />
    <section className="panel">
      {loading
        ? <LoadingState label="Loading Payslips..." />
        : <>
          <DataTable columns={columns} rows={rows.map(row => ({ ...row, id: recordId(row) }))} emptyMessage="No Paid Payslips available." />
          <Pagination meta={meta} onPageChange={(value) => { setLoading(true); setPage(value) }} />
        </>}
    </section>
  </>
}
