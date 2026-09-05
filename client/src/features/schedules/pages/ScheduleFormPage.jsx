import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import schedulesApi from '../api/schedulesApi'
import ScheduleForm from '../components/ScheduleForm'

export default function ScheduleFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editing) return
    schedulesApi.get(id).then(setSchedule).catch((requestError) => setError(getApiError(requestError).message)).finally(() => setLoading(false))
  }, [editing, id])

  const submit = async (payload) => {
    setBusy(true); setError('')
    try {
      const saved = editing ? await schedulesApi.update(id, payload) : await schedulesApi.create(payload)
      navigate('/working-schedules', { state: { notice: `Working schedule ${editing ? 'updated' : 'created'} successfully with ${saved.weeklyHours} weekly hours.` } })
    } catch (requestError) { setError(getApiError(requestError).message) }
    finally { setBusy(false) }
  }

  if (loading) return <LoadingState label="Loading working schedule…" />
  if (editing && !schedule) return <section className="center-message"><h1>Unable to load working schedule</h1><p>{error}</p><Link className="button" to="/working-schedules">Back to schedules</Link></section>
  return <><header className="page-header"><div><p className="eyebrow">HR configuration</p><h1>{editing ? 'Edit working schedule' : 'New working schedule'}</h1><p>Define expected working time for each day of the week.</p></div></header><ScheduleForm schedule={schedule} error={error} busy={busy} onSubmit={submit} onCancel={() => navigate('/working-schedules')} /></>
}
