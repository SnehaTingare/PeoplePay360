import httpClient from '../../../shared/api/httpClient'

const departmentsApi = {
  list: (params) => httpClient.get('/departments', { params }).then((response) => response.data),
  get: (id) => httpClient.get(`/departments/${id}`).then((response) => response.data.data),
  create: (payload) => httpClient.post('/departments', payload).then((response) => response.data.data),
  update: (id, payload) => httpClient.patch(`/departments/${id}`, payload).then((response) => response.data.data),
  deactivate: (id) => httpClient.post(`/departments/${id}/deactivate`).then((response) => response.data.data),
}

export default departmentsApi
