const DEFAULT_TIMEOUT_MS = 10000

class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1'

async function request(path, { method = 'GET', body, headers = {}, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
  }).catch((error) => {
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', { status: 408 })
    }
    throw error
  })

  clearTimeout(timer)

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