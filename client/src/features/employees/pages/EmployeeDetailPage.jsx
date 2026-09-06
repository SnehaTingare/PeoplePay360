import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getApiError } from '../../../shared/api/apiError'
import ErrorBanner from '../../../shared/components/ErrorBanner/ErrorBanner'
import LoadingState from '../../../shared/components/LoadingState/LoadingState'
import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import attendanceApi from '../../attendance/api/attendanceApi'
import contractsApi from '../../contracts/api/contractsApi'
import { allocationsApi, requestsApi } from '../../timeOff/api/timeOffApi'
import employeesApi from '../api/employeesApi'
import EmployeeDetails from '../components/EmployeeDetails'
import useEmployeeReferences from '../useEmployeeReferences'

export default function EmployeeDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const references = useEmployeeReferences()
  const [employee, setEmployee] = useState(null)
  const [error, setError] = useState('')
  const [relatedCounts, setRelatedCounts] = useState({ contracts: null, attendance: null, timeOff: null, allocations: null })
  useEffect(() => { employeesApi.get(id).then(setEmployee).catch((requestError) => setError(getApiError(requestError).message)) }, [id])
  useEffect(() => {
    let active = true
    const query = { employeeId: id, page: 1, limit: 1 }
    Promise.allSettled([
      contractsApi.list(query),
      attendanceApi.list(query),
      requestsApi.list(query),
      allocationsApi.list(query),
    ]).then((results) => {
      if (!active) return
      const total = (result) => result.status === 'fulfilled' ? result.value.meta?.total ?? result.value.data?.length ?? 0 : null
      setRelatedCounts({ contracts: total(results[0]), attendance: total(results[1]), timeOff: total(results[2]), allocations: total(results[3]) })
    })
    return () => { active = false }
  }, [id])
  const count = (value) => value === null ? '…' : value
  if (!employee && !error) return <LoadingState label="Loading employee…" />
  if (!employee) return <section className="center-message"><h1>Unable to load employee</h1><p>{error}</p><Link className="button" to="/employees">Back to employees</Link></section>
  return <>{location.state?.notice && <div className="alert alert--success">{location.state.notice}</div>}<ErrorBanner message={references.error} /><header className="page-header"><div><p className="eyebrow">{employee.employeeId}</p><h1>{employee.firstName} {employee.lastName}</h1><div className="badge-row"><StatusBadge value={employee.employmentStatus} /><span className="badge badge--role">{employee.employeeType}</span></div></div><div className="header-actions"><Link className="button button--secondary" to="/employees">Back</Link><Link className="button" to={`/employees/${id}/edit`}>Edit employee</Link></div></header><EmployeeDetails employee={employee} departments={references.departments} schedules={references.schedules} managers={references.managers} /><section className="panel employee-hub"><div><p className="eyebrow">Employee HR hub</p><h2>Related records</h2><p>Open HR records scoped to this employee.</p></div><div className="hub-actions"><Link className="button button--secondary" to={`/contracts?employeeId=${id}`}>Contracts ({count(relatedCounts.contracts)})</Link><Link className="button button--secondary" to={`/attendance?employeeId=${id}`}>Attendance ({count(relatedCounts.attendance)})</Link><Link className="button button--secondary" to={`/time-off/requests?employeeId=${id}`}>Time Off ({count(relatedCounts.timeOff)})</Link><Link className="button button--secondary" to={`/time-off/allocations?employeeId=${id}`}>Allocations ({count(relatedCounts.allocations)})</Link></div></section></>
}
