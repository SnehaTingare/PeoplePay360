const messages = {
  'AUTH-001': 'Invalid email or password.',
  'AUTH-002': 'Your session is invalid or has expired. Please sign in again.',
  'AUTH-003': 'You do not have permission to perform this action.',
  'AUTH-004': 'This account is inactive. Contact an administrator.',
  'AUTH-005': 'You must change your password before continuing.',
  'USR-001': 'A user with this email already exists.',
  'USR-002': 'Please select a valid role.',
  'USR-003': 'The password does not meet the required policy.',
  'SCH-001': 'End time must be later than start time and times must use HH:mm.',
  'SCH-002': 'Break duration cannot be negative.',
  'SCH-003': 'Break duration must be shorter than the shift.',
  'SCH-004': 'Each schedule day must be valid and configured only once.',
  'SCH-005': 'Configure at least one working day.',
  'EMP-001': 'An employee with this email already exists.',
  'EMP-002': 'An employee cannot be assigned as their own manager.',
  'EMP-003': 'Department and job position are required.',
  'EMP-004': 'This employee is inactive.',
  'EMP-005': 'You cannot access another employee’s record.',
  'CTR-001': 'Contract start date must be before or equal to end date.',
  'CTR-002': 'Another contract for this employee overlaps the selected period.',
  'CTR-004': 'Contract wage is required for wage-based payroll.',
  'CTR-005': 'Contract wage cannot be negative.',
  'CTR-006': 'Contract Salary Structure is required.',
  'ATT-001': 'No open check-in exists for this employee.',
  'ATT-002': 'Check-out must be later than check-in.',
  'ATT-003': 'An open check-in already exists for this employee.',
  'ATT-005': 'Only HR or Payroll users can correct attendance records.',
  DUPLICATE_CODE: 'That department code is already in use.',
  RESOURCE_CONFLICT: 'This record changed. Reload it and try again.',
  VALIDATION_ERROR: 'Please review the highlighted information.',
  RESOURCE_NOT_FOUND: 'The requested record could not be found.',
}

export const getApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  const payload = error?.response?.data
  return {
    code: payload?.code,
    message: payload?.message || messages[payload?.code] || fallback,
    details: payload?.details || {},
    status: error?.response?.status,
  }
}
