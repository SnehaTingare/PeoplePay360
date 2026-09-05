export const CATEGORIES = ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET']
export const CALCULATION_TYPES = ['FIXED', 'PERCENTAGE', 'FORMULA']
export const recordId = (value) => String(value?._id || value?.id || value || '')
export const structureLabel = (value, structures) => {
  if (value && typeof value === 'object') return value.name || value.code
  const structure = structures.find((item) => recordId(item) === recordId(value))
  return structure?.name || 'Unknown Structure'
}
export const compact = (value) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== ''))
