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

export const getSimDetails = (simId, params) =>
    apiClient.get(`/sims/${simId}${buildQueryString(params)}`)

