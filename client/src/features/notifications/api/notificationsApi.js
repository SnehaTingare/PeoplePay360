import httpClient from '../../../shared/api/httpClient'

const notificationsApi = {
  list: (params) => httpClient.get('/notifications', { params }).then((response) => response.data),
  markRead: (id) => httpClient.patch(`/notifications/${id}/read`).then((response) => response.data.data),
  markAllRead: () => httpClient.patch('/notifications/read-all').then((response) => response.data.data),
}

export default notificationsApi
