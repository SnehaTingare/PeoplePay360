import httpClient from '../../shared/api/httpClient'

export const usersApi = {
  list: (params) => httpClient.get('/users', { params }).then((response) => response.data),
  create: (payload) => httpClient.post('/users', payload).then((response) => response.data.data),
  get: (id) => httpClient.get(`/users/${id}`).then((response) => response.data.data),
  update: (id, payload) => httpClient.patch(`/users/${id}`, payload).then((response) => response.data.data),
  changeRole: (id, role) => httpClient.patch(`/users/${id}/role`, { role }).then((response) => response.data.data),
  activate: (id) => httpClient.post(`/users/${id}/activate`).then((response) => response.data.data),
  deactivate: (id) => httpClient.post(`/users/${id}/deactivate`).then((response) => response.data.data),
  resetPassword: (id) => httpClient.post(`/users/${id}/reset-password`).then((response) => response.data.data),
}
