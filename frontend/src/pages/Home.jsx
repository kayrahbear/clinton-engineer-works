import { useEffect, useState } from 'react'
import { apiClient } from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Home() {
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    data: null,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    apiClient
      .get('/health')
      .then((data) => {
        if (isMounted) {
          setHealthStatus({ loading: false, data, error: null })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setHealthStatus({ loading: false, data: null, error })
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="text-xl font-semibold text-ff-text">Welcome home</h2>
        <p className="mt-2 text-sm text-ff-muted">
          Use the navigation to build your legacy. Next up: connect the API service
          layer and start surfacing real sim data.
        </p>
        <p className="mt-3 text-xs text-ff-subtle">
          API base URL: {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1'}
        </p>
      </section>
      <section className="ff-card ff-card-hover p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ff-mint">Backend health</h3>
            <p className="mt-2 text-xs text-ff-muted">
              Confirms the frontend can call the Lambda API.
            </p>
          </div>
          {healthStatus.loading ? (
            <LoadingSpinner label="Checking" />
          ) : healthStatus.error ? (
            <span className="ff-chip border-rose-400/40 bg-rose-500/15 text-rose-100">
              Error
            </span>
          ) : (
            <span className="ff-chip border-emerald-400/40 bg-emerald-500/15 text-emerald-100">
              Healthy
            </span>
          )}
        </div>

        <div className="mt-4">
          {healthStatus.loading ? (
            <LoadingSkeleton lines={3} />
          ) : healthStatus.error ? (
            <ErrorState
              title="Unable to reach backend"
              message={healthStatus.error.message}
              onRetry={() => window.location.reload()}
            />
          ) : (
            <div className="rounded-xl border border-ff-border/80 bg-ff-surface2/70 p-4 text-sm text-ff-text">
              <p>
                Status: <span className="font-semibold">{healthStatus.data?.status}</span>
              </p>
              <p className="mt-2 text-xs text-ff-muted">
                DB time: {healthStatus.data?.dbTime ?? 'Unknown'}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="ff-card ff-card-hover p-5">
        <h3 className="text-sm font-semibold text-ff-pink">Loading states</h3>
        <p className="mt-2 text-xs text-ff-muted">
          Use these while fetching Sims, legacies, or reference data.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-ff-border/80 bg-ff-surface2/70 p-4">
            <LoadingSpinner label="Fetching Sims roster" />
          </div>
          <div className="rounded-xl border border-ff-border/80 bg-ff-surface2/70 p-4">
            <LoadingSkeleton lines={4} />
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {[
          {
            title: 'Create your legacy',
            detail: 'Define succession laws and pick your founder.',
          },
          {
            title: 'Track the roster',
            detail: 'Capture traits, skills, careers, and life stages.',
          },
          {
            title: 'Tell the story',
            detail: 'Log milestones and generate narrative summaries.',
          },
          {
            title: 'Export to Obsidian',
            detail: 'Create markdown chronicles for every generation.',
          },
        ].map((card) => (
          <article
            key={card.title}
            className="ff-card ff-card-hover p-5"
          >
            <h3 className="text-sm font-semibold text-ff-lilac2">{card.title}</h3>
            <p className="mt-2 text-sm text-ff-muted">{card.detail}</p>
          </article>
        ))}
      </section>
    </div>
  )
}