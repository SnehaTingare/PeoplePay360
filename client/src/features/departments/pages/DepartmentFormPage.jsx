import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import employeesApi from '../../employees/api/employeesApi'
import departmentsApi from '../api/departmentsApi'
import DepartmentForm from '../components/DepartmentForm'

export default function DepartmentFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [department, setDepartment] = useState(null)
  const [managerOptions, setManagerOptions] = useState([])
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editing) return
    departmentsApi.get(id).then(setDepartment).catch((requestError) => setError(getApiError(requestError).message)).finally(() => setLoading(false))
  }, [editing, id])

  useEffect(() => {
    employeesApi.list({ active: true, page: 1, limit: 100 })
      .then((result) => setManagerOptions(result.data))
      .catch((requestError) => setError(getApiError(requestError).message))
  }, [])

  const submit = async (payload) => {
    setBusy(true); setError('')
    try {
      if (editing) await departmentsApi.update(id, payload)
      else await departmentsApi.create(payload)
      navigate('/departments', { state: { notice: `Department ${editing ? 'updated' : 'created'} successfully.` } })
    } catch (requestError) { setError(getApiError(requestError).message) }
    finally { setBusy(false) }
  }

  if (loading) return <LoadingState label="Loading department…" />
  if (editing && !department) return <section className="center-message"><h1>Unable to load department</h1><p>{error}</p><Link className="button" to="/departments">Back to departments</Link></section>
  return <><header className="page-header"><div><p className="eyebrow">HR configuration</p><h1>{editing ? 'Edit department' : 'New department'}</h1><p>{editing ? 'Update the department’s supported details.' : 'Create a department for employee organization and reporting.'}</p></div></header><DepartmentForm department={department} managerOptions={managerOptions} error={error} busy={busy} onSubmit={submit} onCancel={() => navigate('/departments')} /></>
}
