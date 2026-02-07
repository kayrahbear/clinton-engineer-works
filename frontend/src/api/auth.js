import { apiClient } from './client'
import { setTokens, clearTokens } from './client'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1'

/**
 * Raw POST for auth endpoints that should not trigger 401 retry logic.
 */
async function authFetch(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed')
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export async function loginUser(email, password) {
  const result = await authFetch('/auth/login', { email, password })
  setTokens(result.access_token, result.refresh_token)
  return result.user
}

export async function registerUser(email, password, displayName) {
  const result = await authFetch('/auth/register', {
    email,
    password,
    display_name: displayName,
  })
  setTokens(result.access_token, result.refresh_token)
  return result.user
}

export async function getCurrentUser() {
  const result = await apiClient.get('/auth/me')
  return result.user
}

export async function logoutUser() {
  const refreshToken = localStorage.getItem('refresh_token')
  try {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken })
  } catch {
    // Ignore errors during logout
  }
  clearTokens()
}
