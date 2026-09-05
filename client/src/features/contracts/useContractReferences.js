import { useEffect, useState } from 'react'
import { useAuth } from '../../app/providers/authContext'
import { getApiError } from '../../shared/api/apiError'
import { ROLES } from '../../shared/constants/roles'
import departmentsApi from '../departments/api/departmentsApi'
import employeesApi from '../employees/api/employeesApi'
import schedulesApi from '../schedules/api/schedulesApi'
import salaryStructuresApi from './api/salaryStructuresApi'

const salaryReaders = [ROLES.HR_PAYROLL_USER, ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN]

export default function useContractReferences() {
  const { user } = useAuth()
  const [state, setState] = useState({ employees: [], departments: [], schedules: [], structures: [], loading: true, error: '', salaryStructureAccess: salaryReaders.includes(user?.role) })

  useEffect(() => {
    let active = true
    const requests = [
      employeesApi.list({ page: 1, limit: 100 }),
      departmentsApi.list({ page: 1, limit: 100 }),
      schedulesApi.list({ page: 1, limit: 100 }),
      salaryReaders.includes(user?.role) ? salaryStructuresApi.list({}) : Promise.resolve({ data: [] }),
    ]
    Promise.allSettled(requests).then((results) => {
      if (!active) return
      const values = results.map((result) => result.status === 'fulfilled' ? result.value.data : [])
      const failed = results.find((result) => result.status === 'rejected')
      setState({
        employees: values[0], departments: values[1], schedules: values[2], structures: values[3], loading: false,
        error: failed ? getApiError(failed.reason).message : '', salaryStructureAccess: salaryReaders.includes(user?.role),
      })
    })
    return () => { active = false }
  }, [user?.role])

  return state
}
