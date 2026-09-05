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
  DUPLICATE_CODE: 'That department code is already in use.',
  RESOURCE_CONFLICT: 'This record changed. Reload it and try again.',
  VALIDATION_ERROR: 'Please review the highlighted information.',
  RESOURCE_NOT_FOUND: 'The requested record could not be found.',
}

export const getApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  const payload = error?.response?.data
  return {
    code: payload?.code,
    message: messages[payload?.code] || payload?.message || fallback,
    details: payload?.details || {},
    status: error?.response?.status,
  }
}
