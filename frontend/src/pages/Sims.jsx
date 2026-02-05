import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorState from '../components/ErrorState'
import { useActiveLegacy } from '../context/useActiveLegacy'

const filters = [
  {
    label: 'Generation',
    options: ['All', '1', '2', '3', '4', '5'],
  },
  {
    label: 'Life stage',
    options: ['All', 'infant', 'toddler', 'child', 'teen', 'young adult', 'adult', 'elder'],
  },
  {
    label: 'Occult type',
    options: ['All', 'human', 'vampire', 'spellcaster', 'werewolf', 'mermaid', 'alien'],
  },
  {
    label: 'Status',
    options: ['All', 'alive', 'dead', 'moved_out'],
  },
]

export default function Sims() {
  const { activeLegacyId, loading: legacyLoading } = useActiveLegacy()
  const [sims, setSims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFilters, setSelectedFilters] = useState({
    generation: 'All',
    lifeStage: 'All',
    occultType: 'All',
    status: 'All',
  })

  useEffect(() => {
    async function fetchSims() {
      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.get(`/legacies/${activeLegacyId}/sims`)
        setSims(response.data || [])
      } catch (err) {
        console.error('Error fetching sims:', err)
        setError(err.message || 'Failed to load sims')
      } finally {
        setLoading(false)
      }
    }

    if (legacyLoading) {
      return
    }

    if (activeLegacyId) {
      fetchSims()
    } else {
      setLoading(false)
      setError('No active legacy selected. Pick one from the header or create a new legacy.')
    }
  }, [activeLegacyId, legacyLoading])

  const filteredSims = sims.filter((sim) => {
    if (selectedFilters.generation !== 'All') {
      const genMatch = sim.generation_id && sim.generation_id.toString() === selectedFilters.generation
      if (!genMatch) return false
    }
    if (selectedFilters.lifeStage !== 'All' && sim.life_stage !== selectedFilters.lifeStage) {
      return false
    }
    if (selectedFilters.occultType !== 'All' && sim.occult_type !== selectedFilters.occultType) {
      return false
    }
    if (selectedFilters.status !== 'All' && sim.status !== selectedFilters.status) {
      return false
    }
    return true
  })

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }))
  }

  const resetFilters = () => {
    setSelectedFilters({
      generation: 'All',
      lifeStage: 'All',
      occultType: 'All',
      status: 'All',
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load sims"
        message={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Sims roster</p>
          <h2 className="text-2xl font-semibold text-ff-text">Your legacy cast</h2>
          <p className="mt-2 text-sm text-ff-muted">
            Filter by generation, life stage, or occult. Each card surfaces key vibes at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ff-muted">{filteredSims.length} sims</span>
          <Link to="/sims/new" className="ff-btn">
            + Add Sim
          </Link>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="ff-card flex h-fit flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ff-text">Filters</h3>
            <button 
              onClick={resetFilters}
              className="text-xs uppercase tracking-[0.2em] text-ff-mint hover:text-ff-mint/80 transition"
            >
              Reset
            </button>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Generation</span>
              <select 
                className="ff-input text-sm"
                value={selectedFilters.generation}
                onChange={(e) => handleFilterChange('generation', e.target.value)}
              >
                {filters[0].options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Life stage</span>
              <select 
                className="ff-input text-sm"
                value={selectedFilters.lifeStage}
                onChange={(e) => handleFilterChange('lifeStage', e.target.value)}
              >
                {filters[1].options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Occult type</span>
              <select 
                className="ff-input text-sm"
                value={selectedFilters.occultType}
                onChange={(e) => handleFilterChange('occultType', e.target.value)}
              >
                {filters[2].options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Status</span>
              <select 
                className="ff-input text-sm"
                value={selectedFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                {filters[3].options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/50 p-3 text-xs text-ff-muted">
            <p className="font-semibold text-ff-text">Tip</p>
            <p className="mt-1">Hover cards for a soft glow and quick stat strip.</p>
          </div>
        </aside>

        {filteredSims.length === 0 ? (
          <div className="ff-card flex min-h-[400px] flex-col items-center justify-center gap-4 p-12 text-center">
            <div className="text-4xl opacity-50">🎭</div>
            <div>
              <h3 className="text-lg font-semibold text-ff-text">No sims found</h3>
              <p className="mt-2 text-sm text-ff-muted">
                {sims.length === 0
                  ? 'Create your first sim to start your legacy'
                  : 'Try adjusting your filters'}
              </p>
            </div>
            <Link to="/sims/new" className="ff-btn">
              + Add Sim
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSims.map((sim) => (
              <Link key={sim.sim_id} to={`/sims/${sim.sim_id}`} className="group">
                <article className="ff-card ff-card-hover flex h-full flex-col gap-4 p-5 transition hover:-translate-y-0.5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full border border-ff-mint/40 bg-gradient-to-br from-ff-pink/40 via-ff-mint/40 to-ff-lilac/50 overflow-hidden">
                        {sim.portrait && (
                          <img
                            src={sim.portrait}
                            alt={sim.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      {sim.is_heir && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-ff-surface px-2 py-0.5 text-[10px] font-semibold text-ff-mint">
                          Heir
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-ff-text">{sim.name}</h3>
                      <p className="text-xs text-ff-muted">
                        {sim.life_stage?.replace('_', ' ')} · {sim.occult_type}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="ff-chip text-xs text-ff-pink">{sim.occult_type}</span>
                    <span className="ff-chip text-xs text-ff-lilac2">
                      {sim.life_stage?.replace('_', ' ')}
                    </span>
                    {sim.status !== 'alive' && (
                      <span className="ff-chip text-xs text-ff-subtle">{sim.status}</span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between text-xs text-ff-muted">
                    <span className="uppercase tracking-[0.2em]">View profile</span>
                    <span className="text-ff-mint transition group-hover:translate-x-1">→</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
