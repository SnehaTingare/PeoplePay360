import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import TemporaryPasswordDialog from '../../../shared/components/TemporaryPasswordDialog/TemporaryPasswordDialog'
import employeesApi from '../api/employeesApi'
import EmployeeForm from '../components/EmployeeForm'
import { recordId, referenceId } from '../employeeUtils'
import useEmployeeReferences from '../useEmployeeReferences'

export default function EmployeeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const references = useEmployeeReferences()
  const [employee, setEmployee] = useState(null)
  const [loadingEmployee, setLoadingEmployee] = useState(editing)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [onboardingResult, setOnboardingResult] = useState(null)

  useEffect(() => {
    if (!editing) return
    employeesApi.get(id).then(setEmployee).catch((requestError) => setError(getApiError(requestError).message)).finally(() => setLoadingEmployee(false))
  }, [editing, id])

  const submit = async (payload) => {
    setBusy(true); setError('')
    try {
      if (editing) {
        const saved = await employeesApi.update(id, payload)
        navigate(`/employees/${recordId(saved)}`, { state: { notice: 'Employee updated successfully.' } })
      } else {
        setOnboardingResult(await employeesApi.create(payload))
      }
    } catch (requestError) { setError(getApiError(requestError).message) }
    finally { setBusy(false) }
  }

  if (references.loading || loadingEmployee) return <LoadingState label="Loading employee form…" />
  if (editing && !employee) return <section className="center-message"><h1>Unable to load employee</h1><p>{error}</p><Link className="button" to="/employees">Back to employees</Link></section>
  return <><header className="page-header"><div><p className="eyebrow">Employee management</p><h1>{editing ? 'Edit employee' : 'New employee'}</h1><p>{editing ? 'Update this employee’s HR master information.' : 'Create the HR profile and provision an Employee login account.'}</p></div></header><EmployeeForm employee={employee} departments={references.departments.filter((item) => item.active || (employee && recordId(item) === referenceId(employee.department)))} schedules={references.schedules.filter((item) => item.active || (employee && recordId(item) === referenceId(employee.workingSchedule)))} managers={references.managers} error={error || references.error} busy={busy} onSubmit={submit} onCancel={() => navigate(editing ? `/employees/${id}` : '/employees')} /><TemporaryPasswordDialog result={onboardingResult} title="Employee and login account created" onDone={() => { const employeeId = recordId(onboardingResult?.employee); navigate(`/employees/${employeeId}`, { state: { notice: 'Employee created successfully.' } }) }} /></>
}
