import { apiClient } from './client'

export const getGeneration = (generationId) => apiClient.get(`/generations/${generationId}`)

export const getGenerationGoals = (generationId) => apiClient.get(`/generations/${generationId}/goals`)

export const updateGoalCompletion = (goalId, body) => apiClient.put(`/goals/${goalId}/complete`, body)
