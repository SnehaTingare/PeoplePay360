import axios from 'axios'

export const TOKEN_KEY = 'peoplepay360_token'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {}
    if (status === 401 && data?.code === 'AUTH-002') {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new CustomEvent('pp360:session-expired'))
    }
    if (status === 403 && data?.code === 'AUTH-005') {
      window.dispatchEvent(new CustomEvent('pp360:password-required'))
    }
    return Promise.reject(error)
  },
)

export default httpClient
