import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)

    try {
      await register(email, password, displayName)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.data?.error || err.message || 'Registration failed')
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
          <h1 className="mt-2 text-2xl font-semibold text-ff-text">Create account</h1>
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
            <span className="text-sm text-ff-muted">Display name</span>
            <input
              type="text"
              className="ff-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
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
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-ff-muted">Confirm password</span>
            <input
              type="password"
              className="ff-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="ff-btn mt-2" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ff-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-ff-mint hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
