import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getLegacy, getLegacyStats, getLegacySims, getLegacyGenerations } from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import GoalProgressRing from '../components/GoalProgressRing'
import StatCard from '../components/StatCard'
import { useActiveLegacy } from '../context/useActiveLegacy'

const SUCCESSION_LABELS = {
  gender_law: {
    equality: 'Equality',
    strict_equality: 'Strict Equality',
    matriarchy: 'Matriarchy',
    strict_matriarchy: 'Strict Matriarchy',
    patriarchy: 'Patriarchy',
    strict_patriarchy: 'Strict Patriarchy',
  },
  bloodline_law: {
    traditional: 'Traditional',
    strict_traditional: 'Strict Traditional',
    modern: 'Modern',
    foster: 'Foster',
    strict_foster: 'Strict Foster',
  },
  heir_law: {
    first_born: 'First Born',
    last_born: 'Last Born',
    living_will: 'Living Will',
    merit: 'Merit',
    strength: 'Strength',
    random: 'Random',
    exemplar: 'Exemplar',
    democracy: 'Democracy',
    magical_bloodline: 'Magical Bloodline',
    magical_strength: 'Magical Strength',
  },
  species_law: {
    tolerant: 'Tolerant',
    xenoarchy: 'Xenoarchy',
    xenophobic: 'Xenophobic',
    brood: 'Brood',
  },
}

const formatNumber = (value) => {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '§0'
  return `§${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`
}

export default function LegacyDashboard() {
  const { legacyId } = useParams()
  const { activeLegacyId: selectedLegacyId } = useActiveLegacy()
  const activeLegacyId = legacyId || selectedLegacyId

  const [state, setState] = useState({
    loading: true,
    error: null,
    legacy: null,
    stats: null,
    household: [],
    generations: [],
  })

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        const [legacyRes, statsRes, householdRes, generationsRes] = await Promise.all([
          getLegacy(activeLegacyId),
          getLegacyStats(activeLegacyId),
          getLegacySims(activeLegacyId, { current_household: true, status: 'alive' }),
          getLegacyGenerations(activeLegacyId),
        ])

        if (!isMounted) return

        setState({
          loading: false,
          error: null,
          legacy: legacyRes.data,
          stats: statsRes.data,
          household: householdRes.data || [],
          generations: generationsRes.data || [],
        })
      } catch (error) {
        if (!isMounted) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.data?.error || error?.message || 'Failed to load legacy dashboard',
        }))
      }
    }

    if (activeLegacyId) {
      fetchData()
    } else {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'No active legacy selected. Pick one from the header or create a new legacy.',
      }))
    }

    return () => {
      isMounted = false
    }
  }, [activeLegacyId])

  const goalProgress = useMemo(() => {
    const total = Number(state.stats?.goals?.total_goals || 0)
    const completed = Number(state.stats?.goals?.completed_goals || 0)
    if (total === 0) return 0
    return (completed / total) * 100
  }, [state.stats])

  if (state.loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner label="Loading legacy dashboard" />
      </div>
    )
  }

  if (state.error) {
    return (
      <ErrorState
        title="Legacy dashboard unavailable"
        message={state.error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  const legacy = state.legacy
  const stats = state.stats
  const currentGeneration = legacy?.current_generation ?? 1
  const packName = legacy?.current_pack_name || 'Unknown Pack'
  const backstory = legacy?.current_backstory || 'No backstory has been set for this generation yet.'
  const activeGeneration = state.generations.find((g) => g.is_active)
  const activeGenerationId = activeGeneration?.generation_id

  const successionLaws = [
    { label: 'Gender Law', value: SUCCESSION_LABELS.gender_law[legacy?.gender_law] },
    { label: 'Bloodline Law', value: SUCCESSION_LABELS.bloodline_law[legacy?.bloodline_law] },
    { label: 'Heir Law', value: SUCCESSION_LABELS.heir_law[legacy?.heir_law] },
    { label: 'Species Law', value: SUCCESSION_LABELS.species_law[legacy?.species_law] },
  ]

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Legacy Dashboard</p>
          <h1 className="text-3xl font-semibold text-ff-text">{legacy?.legacy_name}</h1>
          <p className="mt-2 text-sm text-ff-muted">
            Track generation progress, succession laws, and household momentum.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="ff-chip text-xs text-ff-mint">
              Generation {currentGeneration}
            </span>
            <span className="ff-chip text-xs text-ff-lilac2">{packName}</span>
          </div>
          {activeGenerationId ? (
            <Link to={`/legacy/${activeLegacyId}/generations/${activeGenerationId}`} className="ff-btn">
              Start Next Generation
            </Link>
          ) : (
            <span className="ff-btn cursor-default opacity-50">Start Next Generation</span>
          )}
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="ff-card ff-card-hover grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">
                Current Generation
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ff-text">
                Gen {currentGeneration} · {packName}
              </h2>
              <p className="mt-2 text-sm text-ff-muted">{backstory}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {activeGenerationId ? (
                <Link to={`/legacy/${activeLegacyId}/generations/${activeGenerationId}`} className="ff-btn-secondary">
                  View goals
                </Link>
              ) : (
                <span className="ff-btn-secondary opacity-50 cursor-default">View goals</span>
              )}
            </div>
            <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/40 p-3 text-xs text-ff-muted">
              Founder:{' '}
              <span className="font-semibold text-ff-text">{legacy?.founder_name ?? 'Not selected'}</span>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <GoalProgressRing
              percent={goalProgress}
              label={`${stats?.goals?.completed_goals ?? 0}/${stats?.goals?.total_goals ?? 0} goals`}
              sublabel="Required + optional"
            />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="ff-card ff-card-hover p-5">
            <h3 className="text-sm font-semibold text-ff-pink">Succession Laws</h3>
            <div className="mt-4 grid gap-3">
              {successionLaws.map((law) => (
                <div
                  key={law.label}
                  className="flex items-center justify-between rounded-xl border border-ff-border/70 bg-ff-surface2/50 px-3 py-2 text-sm"
                >
                  <span className="text-ff-muted">{law.label}</span>
                  <span className="font-semibold text-ff-text">{law.value || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ff-card ff-card-hover p-5">
            <h3 className="text-sm font-semibold text-ff-yellow">Activity Feed</h3>
            <div className="mt-4 grid gap-3 text-sm text-ff-muted">
              <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/40 px-3 py-2">
                Coming soon: recent goals, milestones, and household drama.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Wealth"
          value={formatCurrency(stats?.wealth?.current_household)}
          detail={`Total earned ${formatCurrency(stats?.wealth?.total_accumulated)}`}
          badge="⭐"
          accent="yellow"
        />
        <StatCard
          title="Sims Born"
          value={formatNumber(stats?.sims?.total_born)}
          detail={`${formatNumber(stats?.sims?.living_sims)} living`}
          badge="🌙"
          accent="mint"
        />
        <StatCard
          title="Deaths"
          value={formatNumber(stats?.sims?.total_deaths)}
          detail={`${formatNumber(stats?.sims?.deceased_sims)} deceased`}
          badge="✨"
          accent="pink"
        />
        <StatCard
          title="Collections"
          value={`${formatNumber(stats?.collections?.collections_completed)}/${formatNumber(
            stats?.collections?.collections_started
          )}`}
          detail={`${formatNumber(stats?.collections?.items_collected)} items found`}
          badge="📚"
          accent="lilac"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="ff-card ff-card-hover p-5">
          <h3 className="text-sm font-semibold text-ff-mint">Household Members</h3>
          <p className="mt-2 text-xs text-ff-muted">
            Active sims living on the lot right now.
          </p>
          {state.household.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-ff-border/70 bg-ff-surface2/30 p-6 text-center text-sm text-ff-muted">
              No household members yet. Add your founder to start the legacy.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {state.household.map((sim) => (
                <article
                  key={sim.sim_id}
                  className="rounded-xl border border-ff-border/70 bg-ff-surface2/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-ff-mint/40 bg-ff-surface">
                      {sim.portrait ? (
                        <img src={sim.portrait} alt={sim.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-ff-muted">
                          {sim.name?.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-ff-text">{sim.name}</p>
                      <p className="text-xs text-ff-muted">
                        {sim.life_stage?.replace('_', ' ')} · {sim.occult_type}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="ff-chip text-xs text-ff-lilac2">
                      {sim.life_stage?.replace('_', ' ')}
                    </span>
                    <span className="ff-chip text-xs text-ff-pink">{sim.occult_type}</span>
                    {sim.is_heir && (
                      <span className="ff-chip text-xs text-ff-mint">Heir</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="ff-card ff-card-hover p-5">
          <h3 className="text-sm font-semibold text-ff-lilac2">Generation Snapshot</h3>
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/40 p-3 text-sm text-ff-muted">
              <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Goals</p>
              <p className="mt-2 text-lg font-semibold text-ff-text">
                {stats?.goals?.completed_required_goals ?? 0}/{stats?.goals?.required_goals ?? 0} required
              </p>
              <p className="text-xs text-ff-muted">
                {stats?.goals?.completed_optional_goals ?? 0}/{stats?.goals?.optional_goals ?? 0} optional
              </p>
            </div>
            <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/40 p-3 text-sm text-ff-muted">
              <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Household</p>
              <p className="mt-2 text-lg font-semibold text-ff-text">
                {formatNumber(stats?.sims?.household_members)} active sims
              </p>
              <p className="text-xs text-ff-muted">
                {formatNumber(stats?.sims?.moved_out_sims)} moved out
              </p>
            </div>
            <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/40 p-3 text-sm text-ff-muted">
              <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Generations</p>
              <p className="mt-2 text-lg font-semibold text-ff-text">
                {formatNumber(stats?.generations?.completed_generations)} completed
              </p>
              <p className="text-xs text-ff-muted">
                {formatNumber(stats?.generations?.active_generations)} active now
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
