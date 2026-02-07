import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGeneration, getGenerationGoals, updateGoalCompletion, getEligibleHeirs, selectHeir } from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import GoalProgressRing from '../components/GoalProgressRing'
import Modal from '../components/Modal'

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

function GoalCheckItem({ goal, onToggle }) {
  const [sparkle, setSparkle] = useState(false)

  const handleChange = () => {
    const willComplete = !goal.is_completed
    if (willComplete) {
      setSparkle(true)
      setTimeout(() => setSparkle(false), 1200)
    }
    onToggle(goal.goal_id, willComplete)
  }

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
        goal.is_completed
          ? 'border-ff-mint/30 bg-ff-mint/10 text-ff-muted line-through'
          : 'border-ff-border/70 bg-ff-surface2/40 text-ff-text'
      }`}
    >
      <input
        type="checkbox"
        checked={goal.is_completed}
        onChange={handleChange}
        className="accent-ff-mint"
      />
      <span className="flex-1">{goal.goal_text}</span>
      {sparkle && <span className="animate-twinkle text-base">&#10024;</span>}
    </label>
  )
}

export default function GenerationDetail() {
  const { legacyId, generationId } = useParams()

  const [state, setState] = useState({
    loading: true,
    error: null,
    generation: null,
    goals: null,
  })

  const [heirModal, setHeirModal] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [successionLaws, setSuccessionLaws] = useState(null)
  const [recommendedHeirId, setRecommendedHeirId] = useState(null)
  const [founderName, setFounderName] = useState(null)
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const [genRes, goalsRes] = await Promise.all([
        getGeneration(generationId),
        getGenerationGoals(generationId),
      ])
      setState({
        loading: false,
        error: null,
        generation: genRes.data,
        goals: goalsRes.data,
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.data?.error || error?.message || 'Failed to load generation',
      }))
    }
  }, [generationId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleGoal = useCallback(
    async (goalId, isCompleted) => {
      // Optimistic update
      setState((prev) => {
        if (!prev.goals) return prev
        const update = (list) =>
          list.map((g) => (g.goal_id === goalId ? { ...g, is_completed: isCompleted } : g))
        return {
          ...prev,
          goals: {
            ...prev.goals,
            required_goals: update(prev.goals.required_goals),
            optional_goals: update(prev.goals.optional_goals),
          },
        }
      })

      try {
        await updateGoalCompletion(goalId, { is_completed: isCompleted })
      } catch {
        // Revert on failure by refetching
        const goalsRes = await getGenerationGoals(generationId)
        setState((prev) => ({ ...prev, goals: goalsRes.data }))
      }
    },
    [generationId]
  )

  const openHeirModal = useCallback(async () => {
    setHeirModal(true)
    setLoadingCandidates(true)
    try {
      const res = await getEligibleHeirs(generationId)
      setCandidates(res.data?.candidates || [])
      setSuccessionLaws(res.data?.succession_laws || null)
      setRecommendedHeirId(res.data?.recommended_heir_id || null)
      setFounderName(res.data?.founder_name || null)
    } catch {
      setCandidates([])
      setSuccessionLaws(null)
      setRecommendedHeirId(null)
      setFounderName(null)
    } finally {
      setLoadingCandidates(false)
    }
  }, [generationId])

  const handleSelectHeir = useCallback(
    async (simId) => {
      try {
        await selectHeir(generationId, { heir_id: simId })
        const refreshed = await getGeneration(generationId)
        setState((prev) => ({ ...prev, generation: refreshed.data }))
        setHeirModal(false)
      } catch (error) {
        window.alert(error?.data?.error || error?.message || 'Failed to set heir')
      }
    },
    [generationId]
  )

  const goalProgress = useMemo(() => {
    if (!state.goals) return 0
    const required = state.goals.required_goals || []
    const optional = state.goals.optional_goals || []
    const total = required.length + optional.length
    if (total === 0) return 0
    const completed = required.filter((g) => g.is_completed).length + optional.filter((g) => g.is_completed).length
    return (completed / total) * 100
  }, [state.goals])

  const goalLabel = useMemo(() => {
    if (!state.goals) return '0/0 goals'
    const required = state.goals.required_goals || []
    const optional = state.goals.optional_goals || []
    const total = required.length + optional.length
    const completed = required.filter((g) => g.is_completed).length + optional.filter((g) => g.is_completed).length
    return `${completed}/${total} goals`
  }, [state.goals])

  if (state.loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner label="Loading generation details" />
      </div>
    )
  }

  if (state.error) {
    return (
      <ErrorState
        title="Generation unavailable"
        message={state.error}
        onRetry={fetchData}
      />
    )
  }

  const gen = state.generation
  const goals = state.goals
  const requiredGoals = goals?.required_goals || []
  const optionalGoals = goals?.optional_goals || []

  return (
    <div className="grid gap-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to={`/legacy/${legacyId}`}
            className="text-xs text-ff-mint hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="mt-1 text-3xl font-semibold text-ff-text">
            Generation {gen?.generation_number}
          </h1>
          <p className="mt-1 text-sm text-ff-muted">{gen?.legacy_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {gen?.is_active && (
            <span className="ff-chip text-xs text-ff-mint">Active</span>
          )}
          <span className="ff-chip text-xs text-ff-lilac2">{gen?.pack_name || 'Base Game'}</span>
        </div>
      </header>

      {/* 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Left column - Backstory + Requirements + Heir */}
        <div className="grid gap-6 content-start">
          <div className="ff-card ff-card-hover p-5">
            <h3 className="text-sm font-semibold text-ff-pink">Backstory</h3>
            <div className="mt-3 max-h-80 overflow-y-auto text-sm leading-relaxed text-ff-muted">
              {gen?.backstory || 'No backstory has been set for this generation yet.'}
            </div>
            {gen?.pack_name && (
              <div className="mt-4">
                <span className="ff-chip text-xs text-ff-lilac2">{gen.pack_name}</span>
              </div>
            )}
          </div>

          {gen?.required_traits?.length > 0 && (
            <div className="ff-card ff-card-hover p-5">
              <h3 className="text-sm font-semibold text-ff-lilac2">Required Traits</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {gen.required_traits.map((trait) => (
                  <span key={trait.trait_id} className="ff-chip text-xs text-ff-pink">
                    {trait.trait_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {gen?.required_careers?.length > 0 && (
            <div className="ff-card ff-card-hover p-5">
              <h3 className="text-sm font-semibold text-ff-lilac2">Required Career</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {gen.required_careers.map((career) => (
                  <span key={career.career_id} className="ff-chip text-xs text-ff-yellow">
                    {career.career_name}
                    {career.branch_name ? ` (${career.branch_name})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Founder card */}
          <div className="ff-card ff-card-hover p-5">
            <h3 className="text-sm font-semibold text-ff-pink">Founder</h3>
            {gen?.founder_sim_id ? (
              <Link
                to={`/sims/${gen.founder_sim_id}`}
                className="mt-3 flex items-center gap-3 rounded-xl border border-ff-border/70 bg-ff-surface2/40 p-3 transition-colors hover:border-ff-pink/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-ff-pink/40 bg-ff-surface text-sm text-ff-muted">
                  {gen.founder_name?.slice(0, 1) || '?'}
                </div>
                <div>
                  <p className="font-semibold text-ff-text">{gen.founder_name}</p>
                  <p className="text-xs text-ff-muted">Leads this generation &rarr;</p>
                </div>
              </Link>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-ff-border/70 bg-ff-surface2/30 p-4 text-center text-sm text-ff-muted">
                No founder set. Start this generation to auto-assign.
              </div>
            )}
          </div>

          {/* Heir selection card */}
          <div className="ff-card ff-card-hover p-5">
            <h3 className="text-sm font-semibold text-ff-lilac2">Heir</h3>
            <p className="mt-1 text-xs text-ff-subtle">Will lead the next generation</p>
            {gen?.heir_sim_id ? (
              <div className="mt-3 grid gap-2">
                <Link
                  to={`/sims/${gen.heir_sim_id}`}
                  className="flex items-center gap-3 rounded-xl border border-ff-mint/50 bg-ff-mint/10 p-3 transition-colors hover:border-ff-mint/70"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-ff-mint/40 bg-ff-surface text-sm text-ff-muted">
                    {gen.heir_name?.slice(0, 1) || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-ff-text">{gen.heir_name}</p>
                    <p className="text-xs text-ff-muted">View sim details &rarr;</p>
                  </div>
                </Link>
                <button
                  onClick={openHeirModal}
                  className="ff-btn-secondary text-xs"
                >
                  Change Heir
                </button>
              </div>
            ) : (
              <button
                onClick={openHeirModal}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ff-border/70 bg-ff-surface2/30 p-4 text-sm text-ff-muted transition hover:border-ff-mint/40 hover:text-ff-mint"
              >
                Select Heir
              </button>
            )}
          </div>
        </div>

        {/* Right column - Progress + Goals checklist */}
        <div className="grid gap-6 content-start">
          <div className="ff-card ff-card-hover flex items-center justify-center p-5">
            <GoalProgressRing
              percent={goalProgress}
              label={goalLabel}
              sublabel="Required + optional"
            />
          </div>

          <div className="ff-card ff-card-hover p-5">
            <h3 className="text-sm font-semibold text-ff-mint">Goals</h3>

            {requiredGoals.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-ff-subtle">Required</p>
                <div className="grid gap-2">
                  {requiredGoals.map((goal) => (
                    <GoalCheckItem key={goal.goal_id} goal={goal} onToggle={handleToggleGoal} />
                  ))}
                </div>
              </div>
            )}

            {optionalGoals.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-ff-subtle">Optional</p>
                <div className="grid gap-2">
                  {optionalGoals.map((goal) => (
                    <GoalCheckItem key={goal.goal_id} goal={goal} onToggle={handleToggleGoal} />
                  ))}
                </div>
              </div>
            )}

            {requiredGoals.length === 0 && optionalGoals.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-ff-border/70 bg-ff-surface2/30 p-6 text-center text-sm text-ff-muted">
                No goals defined for this generation.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heir Selection Modal */}
      <Modal
        title="Select Heir"
        description="Choose which child will lead the next generation."
        isOpen={heirModal}
        onClose={() => setHeirModal(false)}
      >
        {loadingCandidates ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner label="Evaluating eligible heirs" />
          </div>
        ) : (
          <div className="grid gap-4">
            {/* Founder context */}
            {founderName && (
              <div className="rounded-lg border border-ff-pink/30 bg-ff-pink/5 px-3 py-2 text-xs text-ff-muted">
                Showing children of <span className="font-semibold text-ff-pink">{founderName}</span>
              </div>
            )}

            {/* Succession laws summary */}
            {successionLaws && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Gender', value: SUCCESSION_LABELS.gender_law[successionLaws.gender_law] },
                  { label: 'Bloodline', value: SUCCESSION_LABELS.bloodline_law[successionLaws.bloodline_law] },
                  { label: 'Heir', value: SUCCESSION_LABELS.heir_law[successionLaws.heir_law] },
                  { label: 'Species', value: SUCCESSION_LABELS.species_law[successionLaws.species_law] },
                ].map((law) => (
                  <div
                    key={law.label}
                    className="flex items-center justify-between rounded-lg border border-ff-border/50 bg-ff-surface2/30 px-2 py-1.5 text-xs"
                  >
                    <span className="text-ff-subtle">{law.label}</span>
                    <span className="font-semibold text-ff-text">{law.value || 'Unknown'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Candidates list */}
            {candidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-ff-muted">
                {gen?.founder_sim_id
                  ? 'No children found for the founder. Add sims with this founder as a parent first.'
                  : 'No founder set for this generation. Start the generation to auto-assign a founder, then select an heir.'}
              </p>
            ) : (
              <div className="grid max-h-80 gap-2 overflow-y-auto">
                {candidates.map((sim) => (
                  <button
                    key={sim.sim_id}
                    onClick={() => sim.is_eligible && handleSelectHeir(sim.sim_id)}
                    disabled={!sim.is_eligible}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                      gen?.heir_sim_id === sim.sim_id
                        ? 'border-ff-mint/50 bg-ff-mint/10'
                        : sim.is_eligible
                          ? 'border-ff-border/70 bg-ff-surface2/40 hover:border-ff-mint/40 hover:shadow-glowMint'
                          : 'cursor-not-allowed border-ff-border/30 bg-ff-surface2/20 opacity-50'
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-ff-mint/40 bg-ff-surface text-xs text-ff-muted">
                      {sim.name?.slice(0, 1)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ff-text">{sim.name}</p>
                        {recommendedHeirId === sim.sim_id && sim.is_eligible && (
                          <span className="ff-chip text-[10px] text-ff-yellow">Recommended</span>
                        )}
                      </div>
                      <p className="text-xs text-ff-muted">
                        {sim.gender} · {sim.life_stage?.replaceAll('_', ' ')} · {sim.occult_type}
                      </p>
                      {!sim.is_eligible && sim.ineligibility_reasons?.length > 0 && (
                        <p className="mt-1 text-[11px] text-ff-pink">
                          {sim.ineligibility_reasons[0]}
                        </p>
                      )}
                    </div>
                    {gen?.heir_sim_id === sim.sim_id && (
                      <span className="text-xs text-ff-mint">Current</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
