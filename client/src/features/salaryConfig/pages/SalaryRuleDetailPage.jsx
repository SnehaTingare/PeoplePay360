import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/authContext'
import { getApiError } from '../../../shared/api/apiError'
import ConfirmDialog from '../../../shared/components/ConfirmDialog/ConfirmDialog'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import { canManageSalaryConfig } from '../../../shared/permissions/permissions'
import salaryConfigApi from '../api/salaryConfigApi'
import { recordId } from '../salaryConfigUtils'

function Item({ label, children }) { return <div className="detail-item"><dt>{label}</dt><dd>{children ?? 'Not available'}</dd></div> }
export default function SalaryRuleDetailPage() {
  const { id } = useParams(); const { user } = useAuth(); const canManage = canManageSalaryConfig(user); const navigate = useNavigate(); const [rule, setRule] = useState(null); const [structure, setStructure] = useState(null); const [error, setError] = useState(''); const [action, setAction] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { salaryConfigApi.getRule(id).then(async (value) => { setRule(value); setStructure(await salaryConfigApi.getStructure(recordId(value.salaryStructure))) }).catch((requestError) => setError(getApiError(requestError).message)) }, [id])
  const run = async () => { setBusy(true); setError(''); try { if (action === 'delete') { await salaryConfigApi.deleteRule(id); navigate('/salary-config/rules'); return } const saved = await salaryConfigApi[action === 'activate' ? 'activateRule' : 'deactivateRule'](id); setRule(saved); setAction('') } catch (requestError) { setError(getApiError(requestError).message); setAction('') } finally { setBusy(false) } }
  if (!rule && !error) return <LoadingState label="Loading Salary Rule..." />
  if (!rule) return <section className="center-message"><h1>Unable to load Salary Rule</h1><p>{error}</p><Link className="button" to="/salary-config/rules">Back</Link></section>
  return <><ErrorBanner message={error} /><header className="page-header"><div><p className="eyebrow">Sequence {rule.sequence}</p><h1>{rule.name}</h1><div className="badge-row"><span className="code-text">{rule.code}</span><StatusBadge value={rule.active ? 'ACTIVE' : 'INACTIVE'} /></div></div><div className="header-actions"><Link className="button button--secondary" to="/salary-config/rules">Back</Link>{canManage && <><Link className="button button--secondary" to={`/salary-config/rules/${id}/edit`}>Edit</Link><button className="button button--secondary" onClick={() => setAction(rule.active ? 'deactivate' : 'activate')}>{rule.active ? 'Deactivate' : 'Activate'}</button><button className="button button--danger" onClick={() => setAction('delete')}>Delete</button></>}</div></header><section className="panel detail-section"><p className="sequence-help">Rules execute in ascending sequence.</p><dl><Item label="Salary Structure"><Link className="table-link" to={`/salary-config/structures/${recordId(rule.salaryStructure)}`}>{structure?.name}</Link></Item><Item label="Sequence"><strong className="sequence-value">{rule.sequence}</strong></Item><Item label="Category">{rule.category}</Item><Item label="Calculation Type">{rule.calculationType}</Item>{rule.calculationType === 'FIXED' && <Item label="Fixed amount">{rule.fixedAmount}</Item>}{rule.calculationType === 'PERCENTAGE' && <><Item label="Percentage">{rule.percentage}%</Item><Item label="Percentage base">{rule.percentageBase}</Item></>}{rule.calculationType === 'FORMULA' && <Item label="Formula"><code>{rule.formula}</code></Item>}</dl></section><ConfirmDialog open={Boolean(action)} title={`${action === 'delete' ? 'Delete' : action === 'activate' ? 'Activate' : 'Deactivate'} this Salary Rule?`} message="The backend will validate dependencies and historical references before applying this action." confirmLabel="Confirm" danger={action !== 'activate'} busy={busy} onCancel={() => setAction('')} onConfirm={run} /></>
}
