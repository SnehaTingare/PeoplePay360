import { dayLabel } from '../scheduleUtils'

export default function WeeklyScheduleEditor({ value, onChange, errors = {} }) {
  const update = (day, changes) => onChange(value.map((line) => line.day === day ? { ...line, ...changes } : line))
  const toggle = (line) => update(line.day, line.isWorkingDay
    ? { isWorkingDay: false, startTime: null, endTime: null, breakMinutes: 0 }
    : { isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakMinutes: 0 })

  return <div className="weekly-editor"><div className="weekly-editor-header"><span>Day</span><span>Working</span><span>Start time</span><span>End time</span><span>Break (min)</span></div>{value.map((line) => <div className={`schedule-line ${line.isWorkingDay ? '' : 'schedule-line--off'}`} key={line.day}>
    <strong>{dayLabel(line.day)}</strong><label className="switch-field"><input type="checkbox" checked={line.isWorkingDay} onChange={() => toggle(line)} /><span>{line.isWorkingDay ? 'Working' : 'Off'}</span></label>
    <input aria-label={`${dayLabel(line.day)} start time`} type="time" disabled={!line.isWorkingDay} required={line.isWorkingDay} value={line.startTime || ''} onChange={(event) => update(line.day, { startTime: event.target.value })} />
    <input aria-label={`${dayLabel(line.day)} end time`} type="time" disabled={!line.isWorkingDay} required={line.isWorkingDay} value={line.endTime || ''} onChange={(event) => update(line.day, { endTime: event.target.value })} />
    <input aria-label={`${dayLabel(line.day)} break minutes`} type="number" min="0" step="1" disabled={!line.isWorkingDay} required={line.isWorkingDay} value={line.breakMinutes} onChange={(event) => update(line.day, { breakMinutes: Number(event.target.value) })} />
    {errors[line.day] && <small className="schedule-line-error">{errors[line.day]}</small>}
  </div>)}</div>
}
