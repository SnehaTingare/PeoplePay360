import httpClient from '../../../shared/api/httpClient'

const salaryStructuresApi = {
  list: (params) => httpClient.get('/payroll/structures', { params }).then((response) => response.data),
}

export default salaryStructuresApi
