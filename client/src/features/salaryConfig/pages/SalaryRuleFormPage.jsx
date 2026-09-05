import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import salaryConfigApi from '../api/salaryConfigApi'
import SalaryRuleForm from '../components/SalaryRuleForm'
import { recordId } from '../salaryConfigUtils'

export default function SalaryRuleFormPage() {
  const { id } = useParams(); const editing = Boolean(id); const [searchParams] = useSearchParams(); const navigate = useNavigate(); const [rule, setRule] = useState(null); const [structures, setStructures] = useState([]); const [rules, setRules] = useState([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  useEffect(() => { let active = true; Promise.all([salaryConfigApi.listStructures({ page: 1, limit: 100 }), salaryConfigApi.listRules({ page: 1, limit: 100 }), editing ? salaryConfigApi.getRule(id) : Promise.resolve(null)]).then(([structureResult, ruleResult, value]) => { if (active) { setStructures(structureResult.data); setRules(ruleResult.data); setRule(value); setLoading(false) } }).catch((requestError) => { if (active) { setError(getApiError(requestError).message); setLoading(false) } }); return () => { active = false } }, [editing, id])
  const submit = async (payload) => { setBusy(true); setError(''); try { const saved = editing ? await salaryConfigApi.updateRule(id, payload) : await salaryConfigApi.createRule(payload); navigate(`/salary-config/rules/${recordId(saved)}`) } catch (requestError) { setError(getApiError(requestError).message) } finally { setBusy(false) } }
  if (loading) return <LoadingState label="Loading Salary Rule form..." />
  if (editing && !rule) return <section className="center-message"><h1>Unable to load Salary Rule</h1><p>{error}</p><Link className="button" to="/salary-config/rules">Back</Link></section>
  const structureId = searchParams.get('salaryStructureId') || ''
  return <><header className="page-header"><div><p className="eyebrow">Payroll configuration</p><h1>{editing ? 'Edit' : 'New'} Salary Rule</h1><p>Rules execute in ascending sequence.</p></div></header><SalaryRuleForm rule={rule} structureId={structureId} structures={structures} rules={rules} error={error} busy={busy} onSubmit={submit} onCancel={() => navigate(editing ? `/salary-config/rules/${id}` : '/salary-config/rules')} /></>
}
