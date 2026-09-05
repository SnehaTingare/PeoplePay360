import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import ConfirmDialog from '../../../shared/components/ConfirmDialog/ConfirmDialog'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import contractsApi from '../api/contractsApi'
import { employeeLabel, formatDate, formatMoney, referenceId, referenceLabel } from '../contractUtils'
import useContractReferences from '../useContractReferences'

function Detail({ label, children }) { return <div className="detail-item"><dt>{label}</dt><dd>{children || 'Not available'}</dd></div> }

export default function ContractDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const references = useContractReferences()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    contractsApi.get(id)
      .then((result) => {
        if (!active) return
        setContract(result)
        setError('')
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError).message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  const runAction = async () => {
    setBusy(true); setError('')
    try {
      if (action === 'delete') { await contractsApi.remove(id); navigate('/contracts', { state: { notice: 'Draft Contract deleted.' } }); return }
      const saved = await contractsApi[action](id); setContract(saved); setAction(null)
    } catch (requestError) { setError(getApiError(requestError).message); setAction(null) }
    finally { setBusy(false) }
  }
  if (loading || references.loading) return <LoadingState label="Loading Contract..." />
  if (!contract) return <section className="center-message"><h1>Unable to load Contract</h1><p>{error}</p><Link className="button" to="/contracts">Back to Contracts</Link></section>
  const employee = referenceLabel(contract.employee, references.employees, employeeLabel)
  const canExpire = contract.status === 'RUNNING' && contract.endDate && new Date(contract.endDate) < new Date(new Date().toISOString().slice(0, 10))
  const employeeId = referenceId(contract.employee)
  return <><ErrorBanner message={error || references.error} />{location.state?.notice && <div className="alert alert--success">{location.state.notice}</div>}<header className="page-header"><div><p className="eyebrow">Contract · {employee}</p><h1>{contract.jobPosition}</h1><div className="badge-row"><StatusBadge value={contract.status} /><span className="badge badge--role">MONTHLY</span></div></div><div className="header-actions"><Link className="button button--secondary" to="/contracts">Back</Link>{contract.status === 'DRAFT' && <Link className="button button--secondary" to={`/contracts/${id}/edit`}>Edit</Link>}{contract.status === 'DRAFT' && <button className="button" onClick={() => setAction('start')}>Start</button>}{['DRAFT', 'RUNNING'].includes(contract.status) && <button className="button button--secondary" onClick={() => setAction('cancel')}>Cancel</button>}{canExpire && <button className="button button--secondary" onClick={() => setAction('expire')}>Expire</button>}{contract.status === 'DRAFT' && <button className="button button--danger" onClick={() => setAction('delete')}>Delete</button>}</div></header>
    <div className="employee-details-grid"><section className="panel detail-section"><h2>Employment terms</h2><dl><Detail label="Employee"><Link className="table-link" to={`/employees/${employeeId}`}>{employee}</Link></Detail><Detail label="Department">{referenceLabel(contract.department, references.departments)}</Detail><Detail label="Job position">{contract.jobPosition}</Detail><Detail label="Working schedule">{referenceLabel(contract.workingSchedule, references.schedules)}</Detail></dl></section><section className="panel detail-section"><h2>Payroll terms</h2><dl><Detail label="Salary Structure">{referenceLabel(contract.salaryStructure, references.structures)}</Detail><Detail label="Monthly wage">{formatMoney(contract.wage)}</Detail><Detail label="Start date">{formatDate(contract.startDate)}</Detail><Detail label="End date">{formatDate(contract.endDate)}</Detail><Detail label="Status"><StatusBadge value={contract.status} /></Detail></dl></section></div>
    <ConfirmDialog open={Boolean(action)} title={`${action === 'delete' ? 'Delete' : action === 'start' ? 'Start' : action === 'cancel' ? 'Cancel' : 'Expire'} this Contract?`} message={action === 'delete' ? 'Only Draft Contracts can be deleted. This action cannot be undone.' : `This will apply the ${action || ''} lifecycle action. Contract status cannot be edited directly.`} confirmLabel={action === 'delete' ? 'Delete' : 'Confirm'} danger={['delete', 'cancel'].includes(action)} busy={busy} onCancel={() => setAction(null)} onConfirm={runAction} />
  </>
}
