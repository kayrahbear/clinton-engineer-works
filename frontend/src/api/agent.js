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

export const getAgentConversation = (legacyId, params) =>
  apiClient.get(`/agent/conversation/${legacyId}${buildQueryString(params)}`)

export const clearAgentConversation = (legacyId, params) =>
  apiClient.delete(`/agent/conversation/${legacyId}${buildQueryString(params)}`)

export const chatWithAgent = ({ legacyId, conversationId, message }, options = {}) =>
  apiClient.post('/agent/chat', {
    legacy_id: legacyId,
    conversation_id: conversationId,
    message,
  }, options)
