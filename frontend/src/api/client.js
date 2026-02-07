const DEFAULT_TIMEOUT_MS = 10000
const TOKEN_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1'

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

let refreshPromise = null

async function attemptRefresh() {
  if (refreshPromise) return refreshPromise

  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return false

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) return false

      const data = await response.json()
      setTokens(data.access_token, data.refresh_token)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function request(path, { method = 'GET', body, headers = {}, timeout = DEFAULT_TIMEOUT_MS, _retry = false } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
  }).catch((error) => {
    clearTimeout(timer)
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', { status: 408 })
    }
    throw error
  })

  clearTimeout(timer)

  // On 401, attempt token refresh and retry once
  if (response.status === 401 && !_retry) {
    const refreshed = await attemptRefresh()
    if (refreshed) {
      return request(path, { method, body, headers, timeout, _retry: true })
    }
    // Refresh failed - clear tokens and notify auth context
    clearTokens()
    window.dispatchEvent(new CustomEvent('auth:logout'))
  }

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    throw new ApiError('Request failed', {
      status: response.status,
      data,
    })
  }

  return data
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

export { ApiError }
