import httpClient from '../../../shared/api/httpClient'

const reportsApi = {
  payrollDashboard: (params) => httpClient.get('/dashboard/payroll', { params }).then((response) => response.data.data),
}

export default reportsApi
