import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGeneration, getGenerationGoals, updateGoalCompletion } from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import GoalProgressRing from '../components/GoalProgressRing'

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

          {gen?.heir_sim_id && (
            <div className="ff-card ff-card-hover p-5">
              <h3 className="text-sm font-semibold text-ff-lilac2">Heir</h3>
              <Link
                to={`/sims/${gen.heir_sim_id}`}
                className="mt-3 flex items-center gap-3 rounded-xl border border-ff-border/70 bg-ff-surface2/40 p-3 transition-colors hover:border-ff-mint/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-ff-mint/40 bg-ff-surface text-sm text-ff-muted">
                  {gen.heir_name?.slice(0, 1) || '?'}
                </div>
                <div>
                  <p className="font-semibold text-ff-text">{gen.heir_name}</p>
                  <p className="text-xs text-ff-muted">View sim details &rarr;</p>
                </div>
              </Link>
            </div>
          )}
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
    </div>
  )
}
