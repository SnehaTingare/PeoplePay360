import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import contractsApi from '../api/contractsApi'
import ContractForm from '../components/ContractForm'
import { recordId } from '../contractUtils'
import useContractReferences from '../useContractReferences'

export default function ContractFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const references = useContractReferences()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!editing) return
    contractsApi.get(id).then(setContract).catch((requestError) => setError(getApiError(requestError).message)).finally(() => setLoading(false))
  }, [editing, id])
  const submit = async (payload) => {
    setBusy(true); setError('')
    try {
      const saved = editing ? await contractsApi.update(id, payload) : await contractsApi.create(payload)
      navigate(`/contracts/${recordId(saved)}`, { state: { notice: `Contract ${editing ? 'updated' : 'created'} successfully.` } })
    } catch (requestError) { setError(getApiError(requestError).message) }
    finally { setBusy(false) }
  }
  if (loading || references.loading) return <LoadingState label="Loading Contract form..." />
  if (editing && !contract) return <section className="center-message"><h1>Unable to load Contract</h1><p>{error}</p><Link className="button" to="/contracts">Back to Contracts</Link></section>
  if (contract && contract.status !== 'DRAFT') return <section className="center-message"><p className="error-code">{contract.status}</p><h1>Historical Contract</h1><p>Only Draft Contracts can be edited.</p><Link className="button" to={`/contracts/${id}`}>View Contract</Link></section>
  const initial = contract || (searchParams.get('employeeId') ? { employee: searchParams.get('employeeId') } : null)
  return <><header className="page-header"><div><p className="eyebrow">Contract management</p><h1>{editing ? 'Edit Contract' : 'New Contract'}</h1><p>Contract status is controlled through explicit lifecycle actions after creation.</p></div></header><ContractForm contract={initial} references={references} error={error || references.error} busy={busy} onSubmit={submit} onCancel={() => navigate(editing ? `/contracts/${id}` : '/contracts')} /></>
}
