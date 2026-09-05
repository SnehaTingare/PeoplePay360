import { useState } from 'react'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import { recordId, referenceId } from '../employeeUtils'

const EMPLOYEE_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'CONTRACT', label: 'Contract' },
]

const JOB_POSITIONS = [
  'Software Engineer',
  'HR Executive',
  'Payroll Executive',
  'Accountant',
  'Sales Executive',
  'Operations Executive',
  'Manager',
]

const fields = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'departmentId',
  'jobPosition',
  'managerId',
  'employeeType',
  'workingScheduleId',
  'joiningDate',
  'accountHolderName',
  'accountNumber',
  'bankName',
  'ifscCode',
]

const bankFields = [
  'accountHolderName',
  'accountNumber',
  'bankName',
  'ifscCode',
]

const emptyErrors = () =>
  Object.fromEntries(fields.map((field) => [field, '']))

const today = () => {
  const now = new Date()

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
}

const formValues = (employee) => ({
  firstName: employee?.firstName || '',
  lastName: employee?.lastName || '',
  email: employee?.email || '',
  phone: employee?.phone || '',

  departmentId: referenceId(employee?.department),
  jobPosition: employee?.jobPosition || '',
  managerId: referenceId(employee?.manager),
  employeeType: employee?.employeeType || '',
  workingScheduleId: referenceId(employee?.workingSchedule),
  joiningDate:
    employee?.joiningDate?.slice(0, 10) || '',

  accountHolderName:
    employee?.bankDetails?.accountHolderName || '',
  accountNumber:
    employee?.bankDetails?.accountNumber || '',
  bankName:
    employee?.bankDetails?.bankName || '',
  ifscCode:
    employee?.bankDetails?.ifscCode || '',
})

export default function EmployeeForm({
  employee,
  departments,
  schedules,
  managers,
  error,
  busy,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(() =>
    formValues(employee),
  )

  const [includeBank, setIncludeBank] =
    useState(Boolean(employee?.bankDetails))

  const [fieldErrors, setFieldErrors] =
    useState(emptyErrors)

  const currentId = recordId(employee)

  const managerOptions = managers.filter(
    (manager) =>
      recordId(manager) !== currentId,
  )

  const maxDate = today()

  const validateField = (name, value) => {
    const text =
      typeof value === 'string'
        ? value.trim()
        : value

    if (
      name === 'firstName' ||
      name === 'lastName'
    ) {
      if (!text) {
        return 'This field is required.'
      }

      if (text.length > 80) {
        return 'Use 80 characters or fewer.'
      }

      if (
        !/^[\p{L}][\p{L}\s'-]*$/u.test(text)
      ) {
        return 'Use letters, spaces, apostrophes, and hyphens only.'
      }

      return ''
    }

    if (name === 'email') {
      if (!text) {
        return 'Email is required.'
      }

      if (text.length > 254) {
        return 'Use 254 characters or fewer.'
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          text,
        )
      ) {
        return 'Enter a valid email address.'
      }

      return ''
    }

    if (name === 'phone') {
      if (!text) {
        return 'Phone number is required.'
      }

      if (!/^\d{10}$/.test(text)) {
        return 'Enter exactly 10 digits.'
      }

      return ''
    }

    if (name === 'departmentId') {
      if (!value) {
        return 'Department is required.'
      }

      const valid = departments.some(
        (item) =>
          recordId(item) === value,
      )

      return valid
        ? ''
        : 'Select a valid department.'
    }

    if (name === 'jobPosition') {
      if (!value) {
        return 'Job position is required.'
      }

      return JOB_POSITIONS.includes(value)
        ? ''
        : 'Select a valid job position.'
    }

    if (name === 'managerId') {
      if (!value) {
        return ''
      }

      if (value === currentId) {
        return 'An employee cannot be their own manager.'
      }

      const valid = managerOptions.some(
        (item) =>
          recordId(item) === value,
      )

      return valid
        ? ''
        : 'Select a valid manager.'
    }

    if (name === 'employeeType') {
      if (!value) {
        return 'Employee type is required.'
      }

      const valid = EMPLOYEE_TYPES.some(
        (option) =>
          option.value === value,
      )

      return valid
        ? ''
        : 'Select a valid employee type.'
    }

    if (name === 'workingScheduleId') {
      if (!value) {
        return 'Working schedule is required.'
      }

      const valid = schedules.some(
        (item) =>
          recordId(item) === value,
      )

      return valid
        ? ''
        : 'Select a valid working schedule.'
    }

    if (name === 'joiningDate') {
      if (!value) {
        return 'Joining date is required.'
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        return 'Enter a valid date.'
      }

      const date = new Date(
        `${value}T00:00:00.000Z`,
      )

      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !==
          value
      ) {
        return 'Enter a valid date.'
      }

      if (value > maxDate) {
        return 'Joining date cannot be in the future.'
      }

      return ''
    }

    if (!includeBank) {
      return ''
    }

    if (name === 'accountHolderName') {
      if (!text) {
        return 'Account holder name is required.'
      }

      if (text.length > 120) {
        return 'Use 120 characters or fewer.'
      }

      if (
        !/^[\p{L}][\p{L}\s'.-]*$/u.test(text)
      ) {
        return 'Enter a valid account holder name.'
      }

      return ''
    }

    if (name === 'accountNumber') {
      if (!text) {
        return 'Account number is required.'
      }

      if (!/^\d{9,18}$/.test(text)) {
        return 'Use 9 to 18 digits only.'
      }

      return ''
    }

    if (name === 'bankName') {
      if (!text) {
        return 'Bank name is required.'
      }

      if (text.length > 120) {
        return 'Use 120 characters or fewer.'
      }

      return ''
    }

    if (name === 'ifscCode') {
      if (!text) {
        return 'IFSC code is required.'
      }

      if (
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
          text.toUpperCase(),
        )
      ) {
        return 'Enter a valid Indian IFSC code.'
      }

      return ''
    }

    return ''
  }

  const setFieldError = (name, value) => {
    setFieldErrors((current) => ({
      ...current,
      [name]: validateField(name, value),
    }))
  }

  const validateForm = () => {
    const next = emptyErrors()

    fields.forEach((name) => {
      if (
        includeBank ||
        !bankFields.includes(name)
      ) {
        next[name] = validateField(
          name,
          form[name],
        )
      }
    })

    setFieldErrors(next)

    return !Object.values(next).some(
      Boolean,
    )
  }

  const update = (
    event,
    validateNow = false,
  ) => {
    const { name } = event.target

    let value = event.target.value

    if (name === 'phone') {
      value = value
        .replace(/\D/g, '')
        .slice(0, 10)
    }

    if (name === 'accountNumber') {
      value = value
        .replace(/\D/g, '')
        .slice(0, 18)
    }

    if (name === 'ifscCode') {
      value = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 11)
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (
      validateNow ||
      fieldErrors[name]
    ) {
      setFieldError(name, value)
    }
  }

  const toggleBank = (event) => {
    const enabled = event.target.checked

    setIncludeBank(enabled)

    if (!enabled) {
      setFieldErrors((current) => ({
        ...current,
        ...Object.fromEntries(
          bankFields.map((name) => [
            name,
            '',
          ]),
        ),
      }))
    }
  }

  const submit = (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email
        .trim()
        .toLowerCase(),

      phone: form.phone.trim(),

      departmentId: form.departmentId,

      jobPosition: form.jobPosition,

      managerId:
        form.managerId || null,

      employeeType: form.employeeType,

      workingScheduleId:
        form.workingScheduleId,

      joiningDate: form.joiningDate,

      bankDetails: includeBank
        ? {
            accountHolderName:
              form.accountHolderName.trim(),

            accountNumber:
              form.accountNumber.trim(),

            bankName:
              form.bankName.trim(),

            ifscCode:
              form.ifscCode
                .trim()
                .toUpperCase(),
          }
        : null,
    })
  }

  const textProps = (name) => ({
    name,
    value: form[name],

    onChange: update,

    onBlur: (event) =>
      setFieldError(
        name,
        event.target.value,
      ),
  })

  const chooseProps = (name) => ({
    name,
    value: form[name],

    onChange: (event) =>
      update(event, true),
  })

  return (
    <form
      className="panel employee-form"
      onSubmit={submit}
      noValidate
    >
      <ErrorBanner message={error} />

      <fieldset>
        <legend>Basic information</legend>

        <div className="form-grid">
          <FormField
            label="First name *"
            htmlFor="employee-first-name"
            error={fieldErrors.firstName}
          >
            <input
              id="employee-first-name"
              required
              maxLength={80}
              {...textProps('firstName')}
            />
          </FormField>

          <FormField
            label="Last name *"
            htmlFor="employee-last-name"
            error={fieldErrors.lastName}
          >
            <input
              id="employee-last-name"
              required
              maxLength={80}
              {...textProps('lastName')}
            />
          </FormField>

          <FormField
            label="Email *"
            htmlFor="employee-email"
            error={fieldErrors.email}
          >
            <input
              id="employee-email"
              type="email"
              required
              maxLength={254}
              {...textProps('email')}
            />
          </FormField>

          <FormField
            label="Phone *"
            htmlFor="employee-phone"
            error={fieldErrors.phone}
          >
            <input
              id="employee-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              placeholder="9876543210"
              {...textProps('phone')}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          Employment information
        </legend>

        <div className="form-grid">
          <FormField
            label="Department *"
            htmlFor="employee-department"
            error={
              fieldErrors.departmentId
            }
          >
            <select
              id="employee-department"
              required
              {...chooseProps(
                'departmentId',
              )}
            >
              <option value="">
                Select department
              </option>

              {departments.map(
                (item) => (
                  <option
                    key={recordId(item)}
                    value={recordId(item)}
                  >
                    {item.name} (
                    {item.code})
                  </option>
                ),
              )}
            </select>
          </FormField>

          <FormField
            label="Job position *"
            htmlFor="employee-position"
            error={
              fieldErrors.jobPosition
            }
          >
            <select
              id="employee-position"
              required
              {...chooseProps(
                'jobPosition',
              )}
            >
              <option value="">
                Select job position
              </option>

              {JOB_POSITIONS.map(
                (position) => (
                  <option
                    key={position}
                    value={position}
                  >
                    {position}
                  </option>
                ),
              )}
            </select>
          </FormField>

          <FormField
            label="Manager"
            htmlFor="employee-manager"
            error={fieldErrors.managerId}
          >
            <select
              id="employee-manager"
              {...chooseProps('managerId')}
            >
              <option value="">
                No manager
              </option>

              {managerOptions.map(
                (item) => (
                  <option
                    key={recordId(item)}
                    value={recordId(item)}
                  >
                    {item.firstName}{' '}
                    {item.lastName} (
                    {item.employeeId})
                  </option>
                ),
              )}
            </select>
          </FormField>

          <FormField
            label="Employee type *"
            htmlFor="employee-type"
            error={
              fieldErrors.employeeType
            }
          >
            <select
              id="employee-type"
              required
              {...chooseProps(
                'employeeType',
              )}
            >
              <option value="">
                Select employee type
              </option>

              {EMPLOYEE_TYPES.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </FormField>

          <FormField
            label="Working schedule *"
            htmlFor="employee-schedule"
            error={
              fieldErrors.workingScheduleId
            }
          >
            <select
              id="employee-schedule"
              required
              {...chooseProps(
                'workingScheduleId',
              )}
            >
              <option value="">
                Select schedule
              </option>

              {schedules.map(
                (item) => (
                  <option
                    key={recordId(item)}
                    value={recordId(item)}
                  >
                    {item.name} —{' '}
                    {item.weeklyHours} hrs
                  </option>
                ),
              )}
            </select>
          </FormField>

          <FormField
            label="Joining date *"
            htmlFor="employee-joining-date"
            error={
              fieldErrors.joiningDate
            }
          >
            <input
              id="employee-joining-date"
              type="date"
              required
              max={maxDate}
              {...chooseProps(
                'joiningDate',
              )}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset>
        <legend>Payroll readiness</legend>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeBank}
            onChange={toggleBank}
          />

          <span>Add bank details</span>
        </label>

        {includeBank && (
          <div className="form-grid bank-fields">
            <FormField
              label="Account holder name *"
              htmlFor="account-holder"
              error={
                fieldErrors.accountHolderName
              }
            >
              <input
                id="account-holder"
                required
                maxLength={120}
                {...textProps(
                  'accountHolderName',
                )}
              />
            </FormField>

            <FormField
              label="Account number *"
              htmlFor="account-number"
              error={
                fieldErrors.accountNumber
              }
            >
              <input
                id="account-number"
                type="text"
                inputMode="numeric"
                minLength={9}
                maxLength={18}
                required
                {...textProps(
                  'accountNumber',
                )}
              />
            </FormField>

            <FormField
              label="Bank name *"
              htmlFor="bank-name"
              error={
                fieldErrors.bankName
              }
            >
              <input
                id="bank-name"
                required
                maxLength={120}
                {...textProps('bankName')}
              />
            </FormField>

            <FormField
              label="IFSC code *"
              htmlFor="ifsc-code"
              error={
                fieldErrors.ifscCode
              }
            >
              <input
                id="ifsc-code"
                required
                maxLength={11}
                placeholder="SBIN0001234"
                {...textProps('ifscCode')}
              />
            </FormField>
          </div>
        )}
      </fieldset>

      <div className="form-actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="button"
          disabled={busy}
        >
          {busy
            ? 'Saving…'
            : employee
              ? 'Save changes'
              : 'Create employee'}
        </button>
      </div>
    </form>
  )
}