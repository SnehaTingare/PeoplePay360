export const recordId = (value) => String(value?._id || value?.id || value || '')
export const referenceId = (value) => recordId(value)
export const employeeLabel = (employee) => employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeId : 'Unknown employee'
export const referenceLabel = (value, options, label = (item) => item.name || item.code) => {
  if (value && typeof value === 'object') return label(value)
  return label(options.find((item) => recordId(item) === recordId(value)) || {}) || 'Not available'
}
export const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not available'
export const formatDateTime = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not recorded'
export const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== '' && value !== undefined))
