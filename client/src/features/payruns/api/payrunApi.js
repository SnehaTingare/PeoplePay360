import httpClient from '../../../shared/api/httpClient'

const data = (response) => response.data.data

const payrunApi = {
  list: (params) => httpClient.get('/payroll/payruns', { params }).then((response) => response.data),
  get: (id) => httpClient.get(`/payroll/payruns/${id}`).then(data),
  previewEligibility: (payload) => httpClient.post('/payroll/payruns/eligible-employees', payload).then(data),
  create: (payload) => httpClient.post('/payroll/payruns', payload).then(data),
  compute: (id) => httpClient.post(`/payroll/payruns/${id}/compute`).then(data),
  validate: (id) => httpClient.post(`/payroll/payruns/${id}/validate`).then(data),
  markPaid: (id) => httpClient.post(`/payroll/payruns/${id}/mark-paid`).then(data),
  sendPayslips: (id) => httpClient.post(`/payroll/payruns/${id}/send-payslips`).then(data),
  payslips: (id) => httpClient.get(`/payroll/payruns/${id}/payslips`).then((response) => response.data),
}

export default payrunApi
