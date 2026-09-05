import httpClient from '../../../shared/api/httpClient'

const schedulesApi = {
  list: (params) => httpClient.get('/working-schedules', { params }).then((response) => response.data),
  get: (id) => httpClient.get(`/working-schedules/${id}`).then((response) => response.data.data),
  create: (payload) => httpClient.post('/working-schedules', payload).then((response) => response.data.data),
  update: (id, payload) => httpClient.patch(`/working-schedules/${id}`, payload).then((response) => response.data.data),
  deactivate: (id) => httpClient.post(`/working-schedules/${id}/deactivate`).then((response) => response.data.data),
}

export default schedulesApi
