export const recordId = (record) => record?.id || record?._id || ''

export const referenceId = (value) => typeof value === 'object' && value !== null ? recordId(value) : value || ''

export const referenceLabel = (value, records, getLabel = (record) => record.name) => {
  if (typeof value === 'object' && value !== null) {
    if (value.name) return value.name
    if (value.firstName) return `${value.firstName} ${value.lastName}`
  }
  const id = referenceId(value)
  const match = records.find((record) => recordId(record) === id)
  return match ? getLabel(match) : id ? 'Assigned' : 'Not assigned'
}

export const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : '—'

export const maskAccount = (value) => value ? `•••• ${String(value).slice(-4)}` : 'Not provided'
