import httpClient from '../../../shared/api/httpClient'

const unwrap = (response) => response.data.data

export const timeOffTypesApi = {
  list: (params) => httpClient.get('/time-off/types', { params }).then((response) => response.data),
  get: (id) => httpClient.get(`/time-off/types/${id}`).then(unwrap),
  create: (payload) => httpClient.post('/time-off/types', payload).then(unwrap),
  update: (id, payload) => httpClient.patch(`/time-off/types/${id}`, payload).then(unwrap),
  deactivate: (id) => httpClient.post(`/time-off/types/${id}/deactivate`).then(unwrap),
}

export const allocationsApi = {
  mine: (params) => httpClient.get('/time-off/allocations/me', { params }).then((response) => response.data),
  list: (params) => httpClient.get('/time-off/allocations', { params }).then((response) => response.data),
  get: (id) => httpClient.get(`/time-off/allocations/${id}`).then(unwrap),
  create: (payload) => httpClient.post('/time-off/allocations', payload).then(unwrap),
  update: (id, payload) => httpClient.patch(`/time-off/allocations/${id}`, payload).then(unwrap),
  approve: (id) => httpClient.post(`/time-off/allocations/${id}/approve`).then(unwrap),
  cancel: (id) => httpClient.post(`/time-off/allocations/${id}/cancel`).then(unwrap),
  remove: (id) => httpClient.delete(`/time-off/allocations/${id}`).then(unwrap),
}

export const requestsApi = {
  mine: (params) => httpClient.get('/time-off/requests/me', { params }).then((response) => response.data),
  list: (params) => httpClient.get('/time-off/requests', { params }).then((response) => response.data),
  get: (id) => httpClient.get(`/time-off/requests/${id}`).then(unwrap),
  create: (payload) => httpClient.post('/time-off/requests', payload).then(unwrap),
  approve: (id) => httpClient.post(`/time-off/requests/${id}/approve`).then(unwrap),
  refuse: (id, comment) => httpClient.post(`/time-off/requests/${id}/refuse`, { comment }).then(unwrap),
}
