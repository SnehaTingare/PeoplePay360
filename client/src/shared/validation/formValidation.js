const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HUMAN_NAME_PATTERN = /^[\p{L}][\p{L}\s'-]*$/u
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const clean = (value) =>
  typeof value === 'string' ? value.trim() : ''

export function requiredText(
  value,
  label = 'This field',
  max = 200,
) {
  const normalized = clean(value)

  if (!normalized) {
    return `${label} is required.`
  }

  if (normalized.length > max) {
    return `${label} must be ${max} characters or fewer.`
  }

  return ''
}

export function optionalText(
  value,
  label = 'This field',
  max = 2000,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return ''
  }

  if (typeof value !== 'string') {
    return `${label} is invalid.`
  }

  if (value.length > max) {
    return `${label} must be ${max} characters or fewer.`
  }

  return ''
}

export function humanName(
  value,
  label = 'Name',
  max = 80,
) {
  const requiredError = requiredText(
    value,
    label,
    max,
  )

  if (requiredError) {
    return requiredError
  }

  const normalized = clean(value)

  if (!HUMAN_NAME_PATTERN.test(normalized)) {
    return `${label} may contain only letters, spaces, apostrophes, and hyphens.`
  }

  return ''
}

export function email(
  value,
  label = 'Email',
) {
  const requiredError = requiredText(
    value,
    label,
    254,
  )

  if (requiredError) {
    return requiredError
  }

  if (!EMAIL_PATTERN.test(clean(value))) {
    return 'Enter a valid email address.'
  }

  return ''
}

export function code(
  value,
  label = 'Code',
  max = 80,
) {
  const requiredError = requiredText(
    value,
    label,
    max,
  )

  if (requiredError) {
    return requiredError
  }

  const normalized = clean(value).toUpperCase()

  if (!CODE_PATTERN.test(normalized)) {
    return `${label} must start with a letter and contain only uppercase letters, digits, or underscores.`
  }

  return ''
}

export function oneOf(
  value,
  allowedValues,
  label = 'Selection',
  required = true,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return required
      ? `${label} is required.`
      : ''
  }

  return allowedValues.includes(value)
    ? ''
    : `Select a valid ${label.toLowerCase()}.`
}

export function nonNegativeNumber(
  value,
  label = 'Value',
  required = true,
) {
  if (
    value === '' ||
    value === undefined ||
    value === null
  ) {
    return required
      ? `${label} is required.`
      : ''
  }

  const number = Number(value)

  if (!Number.isFinite(number)) {
    return `${label} must be a valid number.`
  }

  if (number < 0) {
    return `${label} cannot be negative.`
  }

  return ''
}

export function positiveNumber(
  value,
  label = 'Value',
) {
  const error = nonNegativeNumber(
    value,
    label,
    true,
  )

  if (error) {
    return error
  }

  if (Number(value) <= 0) {
    return `${label} must be greater than zero.`
  }

  return ''
}

export function nonNegativeInteger(
  value,
  label = 'Value',
) {
  const error = nonNegativeNumber(
    value,
    label,
    true,
  )

  if (error) {
    return error
  }

  if (!Number.isSafeInteger(Number(value))) {
    return `${label} must be a whole number.`
  }

  return ''
}

export function dateOnly(
  value,
  label = 'Date',
  required = true,
) {
  if (!value) {
    return required
      ? `${label} is required.`
      : ''
  }

  if (
    typeof value !== 'string' ||
    !DATE_PATTERN.test(value)
  ) {
    return `Enter a valid ${label.toLowerCase()}.`
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  )

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !==
      value
  ) {
    return `Enter a valid ${label.toLowerCase()}.`
  }

  return ''
}

export function dateRange(
  start,
  end,
  startLabel = 'Start date',
  endLabel = 'End date',
  endRequired = true,
) {
  const startError = dateOnly(
    start,
    startLabel,
    true,
  )

  if (startError) {
    return startError
  }

  const endError = dateOnly(
    end,
    endLabel,
    endRequired,
  )

  if (endError) {
    return endError
  }

  if (!end) {
    return ''
  }

  if (end < start) {
    return `${endLabel} cannot be before ${startLabel.toLowerCase()}.`
  }

  return ''
}

export function optionExists(
  value,
  options,
  getId,
  label = 'Selection',
  required = true,
) {
  if (!value) {
    return required
      ? `${label} is required.`
      : ''
  }

  const exists = options.some(
    (option) =>
      String(getId(option)) === String(value),
  )

  return exists
    ? ''
    : `Select a valid ${label.toLowerCase()}.`
}