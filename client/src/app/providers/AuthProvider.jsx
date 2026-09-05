import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../../features/auth'
import { TOKEN_KEY } from '../../shared/api/httpClient'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setIsLoading(false)
  }, [])

  const refreshUser = useCallback(async () => {
    const currentUser = await authApi.me()
    setUser(currentUser)
    return currentUser
  }, [])

  useEffect(() => {
    if (!token) return undefined
    let active = true
    authApi.me()
      .then((currentUser) => { if (active) setUser(currentUser) })
      .catch(() => { if (active) clearSession() })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [token, clearSession])

  useEffect(() => {
    const expired = () => clearSession()
    const passwordRequired = () => setUser((current) => current ? { ...current, mustChangePassword: true } : current)
    window.addEventListener('pp360:session-expired', expired)
    window.addEventListener('pp360:password-required', passwordRequired)
    return () => {
      window.removeEventListener('pp360:session-expired', expired)
      window.removeEventListener('pp360:password-required', passwordRequired)
    }
  }, [clearSession])

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials)
    localStorage.setItem(TOKEN_KEY, result.token)
    setToken(result.token)
    const currentUser = await authApi.me()
    setUser(currentUser)
    return currentUser
  }, [])

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout: clearSession,
    refreshUser,
    hasRole: (...roles) => roles.includes(user?.role),
  }), [token, user, isLoading, login, clearSession, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
