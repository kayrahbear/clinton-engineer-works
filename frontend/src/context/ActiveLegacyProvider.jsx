import { useEffect, useMemo, useState } from 'react'
import { getLegacies } from '../api'
import ActiveLegacyContext from './activeLegacyContext'

const STORAGE_KEY = 'active_legacy_id'

export function ActiveLegacyProvider({ children }) {
  const [legacies, setLegacies] = useState([])
  const [activeLegacyId, setActiveLegacyId] = useState(localStorage.getItem(STORAGE_KEY) || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadLegacies() {
      try {
        setLoading(true)
        setError(null)
        const response = await getLegacies()
        if (!isMounted) return

        const legacyRows = response.data || []
        setLegacies(legacyRows)

        const storedLegacyId = localStorage.getItem(STORAGE_KEY) || ''
        const hasSelectedLegacy = legacyRows.some((legacy) => legacy.legacy_id === storedLegacyId)
        const fallbackLegacyId = legacyRows[0]?.legacy_id || ''
        const nextActiveLegacyId = hasSelectedLegacy ? storedLegacyId : fallbackLegacyId

        setActiveLegacyId(nextActiveLegacyId)
        if (nextActiveLegacyId) {
          localStorage.setItem(STORAGE_KEY, nextActiveLegacyId)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (requestError) {
        if (!isMounted) return
        setError(requestError?.data?.error || requestError?.message || 'Failed to load legacies.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLegacies()

    return () => {
      isMounted = false
    }
  }, [])

  const updateActiveLegacyId = (nextLegacyId) => {
    setActiveLegacyId(nextLegacyId)
    if (nextLegacyId) {
      localStorage.setItem(STORAGE_KEY, nextLegacyId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const value = useMemo(
    () => ({
      legacies,
      activeLegacyId,
      setActiveLegacyId: updateActiveLegacyId,
      loading,
      error,
    }),
    [legacies, activeLegacyId, loading, error]
  )

  return <ActiveLegacyContext.Provider value={value}>{children}</ActiveLegacyContext.Provider>
}
