import { useMemo, useState } from 'react'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import { calculatePreviewHours, emptyWeek, normalizeWeek } from '../scheduleUtils'
import WeeklyScheduleEditor from './WeeklyScheduleEditor'

const validateLines = (lines) => {
  const errors = {}
  lines.forEach((line) => {
    if (!line.isWorkingDay) return
    if (!line.startTime || !line.endTime) errors[line.day] = 'Start and end time are required.'
    else {
      const start = Number(line.startTime.slice(0, 2)) * 60 + Number(line.startTime.slice(3))
      const end = Number(line.endTime.slice(0, 2)) * 60 + Number(line.endTime.slice(3))
      if (end <= start) errors[line.day] = 'End time must be later than start time.'
      else if (Number(line.breakMinutes) < 0) errors[line.day] = 'Break cannot be negative.'
      else if (Number(line.breakMinutes) >= end - start) errors[line.day] = 'Break must be shorter than the shift.'
    }
  })
  return errors
}

export default function ScheduleForm({ schedule, error, busy, onSubmit, onCancel }) {
  const [name, setName] = useState(schedule?.name || '')
  const [workingDays, setWorkingDays] = useState(() => schedule ? normalizeWeek(schedule.workingDays) : emptyWeek())
  const [errors, setErrors] = useState({})
  const preview = useMemo(() => calculatePreviewHours(workingDays), [workingDays])
  const submit = (event) => {
    event.preventDefault()
    const lineErrors = validateLines(workingDays)
    if (!name.trim()) lineErrors.form = 'Schedule name is required.'
    if (Object.keys(lineErrors).length) return setErrors(lineErrors)
    setErrors({})
    onSubmit({ name: name.trim(), workingDays: workingDays.map((line) => line.isWorkingDay ? { ...line, breakMinutes: Number(line.breakMinutes) } : { day: line.day, isWorkingDay: false, startTime: null, endTime: null, breakMinutes: 0 }) })
  }

  return <form className="panel schedule-form" onSubmit={submit}><ErrorBanner message={errors.form || error} /><div className="schedule-form-top"><FormField label="Schedule name *" htmlFor="schedule-name"><input id="schedule-name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Standard 40 Hours" /></FormField><div className="hours-preview"><small>{schedule ? 'Saved weekly hours' : 'Calculated preview'}</small><strong>{schedule?.weeklyHours ?? preview} hrs</strong>{schedule && preview !== schedule.weeklyHours && <span>New preview: {preview} hrs</span>}</div></div>
    <div className="section-heading"><div><h2>Weekly pattern</h2><p>Enable any working day and define its shift. Weekly hours are recalculated by the backend when saved.</p></div></div><WeeklyScheduleEditor value={workingDays} onChange={setWorkingDays} errors={errors} />
    <div className="form-actions"><button type="button" className="button button--secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving…' : schedule ? 'Save changes' : 'Create schedule'}</button></div>
  </form>
}
