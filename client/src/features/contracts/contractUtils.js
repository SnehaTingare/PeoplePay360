export const recordId = (record) => record?.id || record?._id || ''

export const referenceId = (value) => typeof value === 'object' && value !== null ? recordId(value) : value || ''

export const referenceLabel = (value, records, label = (record) => record.name) => {
  if (typeof value === 'object' && value !== null) return label(value)
  const match = records.find((record) => recordId(record) === referenceId(value))
  return match ? label(match) : value ? 'Unavailable reference' : 'Not assigned'
}

export const employeeLabel = (employee) => `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeId

export const formatDate = (value) => value
  ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value))
  : 'Open-ended'

export const formatMoney = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0))
