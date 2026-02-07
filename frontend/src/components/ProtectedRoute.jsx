import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center ff-app-bg">
        <LoadingSpinner label="Checking authentication..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
