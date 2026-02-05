import { Link, Navigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { useActiveLegacy } from '../context/useActiveLegacy'

export default function LegacyLanding() {
  const { activeLegacyId, loading } = useActiveLegacy()

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <LoadingSpinner label="Loading legacy" />
      </div>
    )
  }

  if (activeLegacyId) {
    return <Navigate to={`/legacy/${activeLegacyId}`} replace />
  }

  return (
    <div className="ff-card p-6 text-sm text-ff-muted">
      <h2 className="text-lg font-semibold text-ff-text">No Active Legacy</h2>
      <p className="mt-2">Create a new legacy to start tracking your household.</p>
      <Link to="/legacy/new" className="ff-btn mt-4">
        + New Legacy
      </Link>
    </div>
  )
}
