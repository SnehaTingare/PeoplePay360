export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export const dayLabel = (day) => `${day[0]}${day.slice(1).toLowerCase()}`

export const emptyWeek = () => DAYS.map((day) => ({ day, isWorkingDay: false, startTime: null, endTime: null, breakMinutes: 0 }))

export const normalizeWeek = (workingDays = []) => DAYS.map((day) => {
  const saved = workingDays.find((line) => line.day === day)
  return saved ? { day, isWorkingDay: saved.isWorkingDay, startTime: saved.startTime, endTime: saved.endTime, breakMinutes: saved.breakMinutes } : { day, isWorkingDay: false, startTime: null, endTime: null, breakMinutes: 0 }
})

const timeMinutes = (value) => {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  return (hours * 60) + minutes
}

export const calculatePreviewHours = (lines) => lines.reduce((total, line) => {
  if (!line.isWorkingDay) return total
  const start = timeMinutes(line.startTime)
  const end = timeMinutes(line.endTime)
  const breakMinutes = Number(line.breakMinutes)
  if (start === null || end === null || end <= start || breakMinutes < 0 || breakMinutes >= end - start) return total
  return total + ((end - start - breakMinutes) / 60)
}, 0)
