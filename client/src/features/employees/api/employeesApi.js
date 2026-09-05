import httpClient from '../../../shared/api/httpClient'

const employeesApi = {
  list: (params) => httpClient.get('/employees', { params }).then((response) => response.data),
  me: () => httpClient.get('/employees/me').then((response) => response.data.data),
  get: (id) => httpClient.get(`/employees/${id}`).then((response) => response.data.data),
  create: (payload) => httpClient.post('/employees', payload).then((response) => response.data.data),
  update: (id, payload) => httpClient.patch(`/employees/${id}`, payload).then((response) => response.data.data),
  activate: (id) => httpClient.post(`/employees/${id}/activate`).then((response) => response.data.data),
  deactivate: (id) => httpClient.post(`/employees/${id}/deactivate`).then((response) => response.data.data),
}

export default employeesApi
