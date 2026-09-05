export const PAYRUN_STATUSES = ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID']
export const recordId = (value) => String(value?._id || value?.id || value || '')
export const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : 'Not available'
export const formatMoney = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0))
export const compact = (value) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== ''))
export const structureLabel = (value, structures = []) => {
  if (value && typeof value === 'object') return value.name || value.code
  return structures.find((item) => recordId(item) === recordId(value))?.name || 'Unavailable Structure'
}
export const employeeIssueLabel = (value, employees = []) => {
  if (value && typeof value === 'object') return value.name || `${value.firstName || ''} ${value.lastName || ''}`.trim()
  const employee = employees.find((item) => recordId(item) === recordId(value))
  return employee ? `${employee.firstName} ${employee.lastName}` : String(value || 'Unknown employee')
}
