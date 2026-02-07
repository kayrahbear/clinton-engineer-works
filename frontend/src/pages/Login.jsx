import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.data?.error || err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center ff-app-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-ff-muted">
            Sims Legacy Tracker
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ff-text">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="ff-card p-6 grid gap-4">
          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100">
              {error}
            </div>
          )}

          <label className="grid gap-1">
            <span className="text-sm text-ff-muted">Email</span>
            <input
              type="email"
              className="ff-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-ff-muted">Password</span>
            <input
              type="password"
              className="ff-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="ff-btn mt-2" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ff-muted">
          No account?{' '}
          <Link to="/register" className="text-ff-mint hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
