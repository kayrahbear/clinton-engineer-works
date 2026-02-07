import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthContext from './authContext'
import { getCurrentUser, loginUser, registerUser, logoutUser } from '../api/auth'
import { clearTokens } from '../api/client'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkAuth() {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const userData = await getCurrentUser()
        if (isMounted) setUser(userData)
      } catch {
        clearTokens()
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    checkAuth()

    const handleLogout = () => {
      setUser(null)
    }

    window.addEventListener('auth:logout', handleLogout)

    return () => {
      isMounted = false
      window.removeEventListener('auth:logout', handleLogout)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const userData = await loginUser(email, password)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (email, password, displayName) => {
    const userData = await registerUser(email, password, displayName)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }),
    [user, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
