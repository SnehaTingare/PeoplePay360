import { useEffect, useState } from 'react'
import { getApiError } from '../../../shared/api/apiError'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import employeesApi from '../api/employeesApi'
import EmployeeDetails from '../components/EmployeeDetails'

export default function MyProfilePage() {
  const [employee, setEmployee] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { employeesApi.me().then(setEmployee).catch((requestError) => setError(getApiError(requestError).message)).finally(() => setLoading(false)) }, [])
  if (loading) return <LoadingState label="Loading your profile…" />
  return <>{error && <ErrorBanner message={error} />}{employee && <><header className="page-header"><div><p className="eyebrow">My profile · {employee.employeeId}</p><h1>{employee.firstName} {employee.lastName}</h1><div className="badge-row"><StatusBadge value={employee.employmentStatus} /><span className="badge badge--role">{employee.employeeType}</span></div></div></header><EmployeeDetails employee={employee} selfService /></>}</>
}
