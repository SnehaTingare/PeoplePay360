import { useEffect, useState } from 'react'
import departmentsApi from '../departments/api/departmentsApi'
import schedulesApi from '../schedules/api/schedulesApi'
import { getApiError } from '../../shared/api/apiError'
import employeesApi from './api/employeesApi'

export default function useEmployeeReferences() {
  const [data, setData] = useState({ departments: [], schedules: [], managers: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([
      departmentsApi.list({ page: 1, limit: 100 }),
      schedulesApi.list({ page: 1, limit: 100 }),
      employeesApi.list({ employmentStatus: 'ACTIVE', page: 1, limit: 100 }),
    ]).then(([departments, schedules, managers]) => {
      if (active) {
        setData({
          departments: departments.data,
          schedules: schedules.data,
          managers: managers.data.filter(
            (employee) =>
              employee.employmentStatus === 'ACTIVE' &&
              employee.jobPosition === 'Manager'
          ),
        })
      }
    }).catch((requestError) => { if (active) setError(getApiError(requestError).message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return { ...data, loading, error }
}
