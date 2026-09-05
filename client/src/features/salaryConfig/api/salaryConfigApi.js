import httpClient from '../../../shared/api/httpClient'

const data = (response) => response.data.data

const salaryConfigApi = {
  listStructures: (params) => httpClient.get('/payroll/structures', { params }).then((response) => response.data),
  getStructure: (id) => httpClient.get(`/payroll/structures/${id}`).then(data),
  createStructure: (payload) => httpClient.post('/payroll/structures', payload).then(data),
  updateStructure: (id, payload) => httpClient.patch(`/payroll/structures/${id}`, payload).then(data),
  activateStructure: (id) => httpClient.post(`/payroll/structures/${id}/activate`).then(data),
  deactivateStructure: (id) => httpClient.post(`/payroll/structures/${id}/deactivate`).then(data),
  deleteStructure: (id) => httpClient.delete(`/payroll/structures/${id}`).then(data),
  listRules: (params) => httpClient.get('/payroll/rules', { params }).then((response) => response.data),
  getRule: (id) => httpClient.get(`/payroll/rules/${id}`).then(data),
  createRule: (payload) => httpClient.post('/payroll/rules', payload).then(data),
  updateRule: (id, payload) => httpClient.patch(`/payroll/rules/${id}`, payload).then(data),
  activateRule: (id) => httpClient.post(`/payroll/rules/${id}/activate`).then(data),
  deactivateRule: (id) => httpClient.post(`/payroll/rules/${id}/deactivate`).then(data),
  deleteRule: (id) => httpClient.delete(`/payroll/rules/${id}`).then(data),
}

export default salaryConfigApi
