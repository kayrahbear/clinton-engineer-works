import { useContext } from 'react'
import activeLegacyContext from './activeLegacyContext'

export function useActiveLegacy() {
  const context = useContext(activeLegacyContext)
  if (!context) {
    throw new Error('useActiveLegacy must be used inside ActiveLegacyProvider')
  }
  return context
}
