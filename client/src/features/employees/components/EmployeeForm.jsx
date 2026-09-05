import { useState } from 'react'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import FormField from '../../../shared/components/FormField/FormField'
import { recordId, referenceId } from '../employeeUtils'

const formValues = (employee) => ({
  firstName: employee?.firstName || '', lastName: employee?.lastName || '', email: employee?.email || '', phone: employee?.phone || '',
  departmentId: referenceId(employee?.department), jobPosition: employee?.jobPosition || '', managerId: referenceId(employee?.manager),
  employeeType: employee?.employeeType || '', workingScheduleId: referenceId(employee?.workingSchedule), joiningDate: employee?.joiningDate?.slice(0, 10) || '',
  accountHolderName: employee?.bankDetails?.accountHolderName || '', accountNumber: employee?.bankDetails?.accountNumber || '',
  bankName: employee?.bankDetails?.bankName || '', ifscCode: employee?.bankDetails?.ifscCode || '',
})

export default function EmployeeForm({ employee, departments, schedules, managers, error, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => formValues(employee))
  const [includeBank, setIncludeBank] = useState(Boolean(employee?.bankDetails))
  const [fieldError, setFieldError] = useState('')
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const currentId = recordId(employee)
  const managerOptions = managers.filter((manager) => recordId(manager) !== currentId)

  const submit = (event) => {
    event.preventDefault()
    const required = ['firstName', 'lastName', 'email', 'phone', 'departmentId', 'jobPosition', 'employeeType', 'workingScheduleId', 'joiningDate']
    if (required.some((field) => !form[field].trim())) return setFieldError('Complete all required employee and employment fields.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setFieldError('Enter a valid email address.')
    if (form.managerId && form.managerId === currentId) return setFieldError('An employee cannot be their own manager.')
    if (includeBank && ['accountHolderName', 'accountNumber', 'bankName', 'ifscCode'].some((field) => !form[field].trim())) return setFieldError('Complete all bank fields or disable bank details.')
    setFieldError('')
    onSubmit({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(),
      departmentId: form.departmentId, jobPosition: form.jobPosition.trim(), managerId: form.managerId || null,
      employeeType: form.employeeType.trim().toUpperCase(), workingScheduleId: form.workingScheduleId, joiningDate: form.joiningDate,
      bankDetails: includeBank ? { accountHolderName: form.accountHolderName.trim(), accountNumber: form.accountNumber.trim(), bankName: form.bankName.trim(), ifscCode: form.ifscCode.trim().toUpperCase() } : null,
    })
  }

  return <form className="panel employee-form" onSubmit={submit}><ErrorBanner message={fieldError || error} />
    <fieldset><legend>Basic information</legend><div className="form-grid"><FormField label="First name *" htmlFor="employee-first-name"><input id="employee-first-name" name="firstName" required value={form.firstName} onChange={update} /></FormField><FormField label="Last name *" htmlFor="employee-last-name"><input id="employee-last-name" name="lastName" required value={form.lastName} onChange={update} /></FormField><FormField label="Email *" htmlFor="employee-email"><input id="employee-email" name="email" type="email" required value={form.email} onChange={update} /></FormField><FormField label="Phone *" htmlFor="employee-phone"><input id="employee-phone" name="phone" required value={form.phone} onChange={update} /></FormField></div></fieldset>
    <fieldset><legend>Employment information</legend><div className="form-grid"><FormField label="Department *" htmlFor="employee-department"><select id="employee-department" name="departmentId" required value={form.departmentId} onChange={update}><option value="">Select department</option>{departments.map((department) => <option key={recordId(department)} value={recordId(department)}>{department.name} ({department.code})</option>)}</select></FormField><FormField label="Job position *" htmlFor="employee-position"><input id="employee-position" name="jobPosition" required value={form.jobPosition} onChange={update} /></FormField><FormField label="Manager" htmlFor="employee-manager"><select id="employee-manager" name="managerId" value={form.managerId} onChange={update}><option value="">No manager</option>{managerOptions.map((manager) => <option key={recordId(manager)} value={recordId(manager)}>{manager.firstName} {manager.lastName} ({manager.employeeId})</option>)}</select></FormField><FormField label="Employee type *" htmlFor="employee-type" hint="Use a code such as FULL_TIME."><input id="employee-type" name="employeeType" required value={form.employeeType} onChange={update} placeholder="FULL_TIME" /></FormField><FormField label="Working schedule *" htmlFor="employee-schedule"><select id="employee-schedule" name="workingScheduleId" required value={form.workingScheduleId} onChange={update}><option value="">Select schedule</option>{schedules.map((schedule) => <option key={recordId(schedule)} value={recordId(schedule)}>{schedule.name} — {schedule.weeklyHours} hrs</option>)}</select></FormField><FormField label="Joining date *" htmlFor="employee-joining-date"><input id="employee-joining-date" name="joiningDate" type="date" required value={form.joiningDate} onChange={update} /></FormField></div></fieldset>
    <fieldset><legend>Payroll readiness</legend><label className="checkbox-row"><input type="checkbox" checked={includeBank} onChange={(event) => setIncludeBank(event.target.checked)} /><span>Add bank details</span></label>{includeBank && <div className="form-grid bank-fields"><FormField label="Account holder name *" htmlFor="account-holder"><input id="account-holder" name="accountHolderName" required value={form.accountHolderName} onChange={update} /></FormField><FormField label="Account number *" htmlFor="account-number"><input id="account-number" name="accountNumber" required value={form.accountNumber} onChange={update} /></FormField><FormField label="Bank name *" htmlFor="bank-name"><input id="bank-name" name="bankName" required value={form.bankName} onChange={update} /></FormField><FormField label="IFSC code *" htmlFor="ifsc-code"><input id="ifsc-code" name="ifscCode" required value={form.ifscCode} onChange={update} /></FormField></div>}</fieldset>
    <div className="form-actions"><button type="button" className="button button--secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving…' : employee ? 'Save changes' : 'Create employee'}</button></div>
  </form>
}
