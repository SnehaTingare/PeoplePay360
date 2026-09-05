import httpClient from '../../../shared/api/httpClient'

const contractsApi = {
  list: (params) => httpClient.get('/contracts', { params }).then((response) => response.data),
  get: (id) => httpClient.get(`/contracts/${id}`).then((response) => response.data.data),
  create: (payload) => httpClient.post('/contracts', payload).then((response) => response.data.data),
  update: (id, payload) => httpClient.patch(`/contracts/${id}`, payload).then((response) => response.data.data),
  start: (id) => httpClient.post(`/contracts/${id}/start`).then((response) => response.data.data),
  cancel: (id) => httpClient.post(`/contracts/${id}/cancel`).then((response) => response.data.data),
  expire: (id) => httpClient.post(`/contracts/${id}/expire`).then((response) => response.data.data),
  remove: (id) => httpClient.delete(`/contracts/${id}`).then((response) => response.data.data),
}

export default contractsApi
