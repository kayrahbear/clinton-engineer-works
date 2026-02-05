import { apiClient } from './client'

const buildQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  if (entries.length === 0) return ''

  const query = new URLSearchParams()
  entries.forEach(([key, value]) => {
    query.append(key, String(value))
  })

  return `?${query.toString()}`
}

export const getLegacy = (legacyId) => apiClient.get(`/legacies/${legacyId}`)

export const getLegacyStats = (legacyId) => apiClient.get(`/legacies/${legacyId}/stats`)

export const getLegacyGenerations = (legacyId) => apiClient.get(`/legacies/${legacyId}/generations`)

export const getLegacySims = (legacyId, params) =>
  apiClient.get(`/legacies/${legacyId}/sims${buildQueryString(params)}`)
