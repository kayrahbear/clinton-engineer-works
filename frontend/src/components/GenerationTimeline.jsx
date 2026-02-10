import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const STATUS_CONFIG = {
  completed: { dot: 'bg-ff-mint', chip: 'text-ff-mint', bar: 'bg-ff-mint', label: 'Completed' },
  active: { dot: 'bg-ff-yellow', chip: 'text-ff-yellow', bar: 'bg-ff-yellow', label: 'Active' },
  upcoming: {
    dot: 'bg-ff-surface2 border border-ff-border',
    chip: 'text-ff-subtle',
    bar: 'bg-ff-surface2',
    label: 'Upcoming',
  },
}

function getGenStatus(gen) {
  if (gen.completion_date) return 'completed'
  if (gen.is_active) return 'active'
  return 'upcoming'
}

function TimelineCard({ gen, legacyId, status }) {
  const config = STATUS_CONFIG[status]
  const totalGoals = Number(gen.total_goals || 0)
  const completedGoals = Number(gen.completed_goals || 0)
  const percent = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0

  return (
    <Link
      to={`/legacy/${legacyId}/generations/${gen.generation_id}`}
      className={`ff-card ff-card-hover block p-3 sm:p-4 ${status === 'upcoming' ? 'opacity-75' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ff-text">Gen {gen.generation_number}</span>
        {gen.pack_name && <span className="ff-chip text-xs text-ff-lilac2">{gen.pack_name}</span>}
        <span className={`ff-chip ml-auto text-xs ${config.chip}`}>{config.label}</span>
      </div>

      {(gen.founder_name || gen.heir_name) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ff-muted">
          {gen.founder_name && <span>Led by {gen.founder_name}</span>}
          {gen.heir_name && <span>Heir: {gen.heir_name}</span>}
        </div>
      )}

      {totalGoals > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-ff-muted">
            <span>
              {completedGoals}/{totalGoals} goals
            </span>
            <span>{Math.round(percent)}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ff-surface2/70">
            <div
              className={`h-full rounded-full ${config.bar} transition-all duration-500`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}

function CollapseToggle({ count, label, onClick }) {
  return (
    <div className="relative">
      <div className="absolute -left-7 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center sm:-left-8">
        <span className="block h-2 w-2 rounded-full bg-ff-border" />
      </div>
      <button
        onClick={onClick}
        className="w-full rounded-xl border border-dashed border-ff-border/70 bg-ff-surface2/30 px-4 py-2 text-center text-xs text-ff-muted transition hover:border-ff-mint/40 hover:text-ff-text"
      >
        Show {count} more {label}
      </button>
    </div>
  )
}

export default function GenerationTimeline({ generations, legacyId, autoScrollToActive = true }) {
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const activeRef = useRef(null)

  useEffect(() => {
    if (autoScrollToActive && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [autoScrollToActive])

  if (!generations || generations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ff-border/70 bg-ff-surface2/30 p-6 text-center text-sm text-ff-muted">
        No generations yet. Create your first generation to see the timeline.
      </div>
    )
  }

  const completed = generations.filter((g) => g.completion_date)
  const active = generations.filter((g) => g.is_active)
  const upcoming = generations.filter((g) => !g.completion_date && !g.is_active)

  const visibleItems = []

  // Completed section (collapse middle if >5)
  if (!showAllCompleted && completed.length > 5) {
    visibleItems.push(...completed.slice(0, 2))
    visibleItems.push({ _type: 'collapsed-completed', count: completed.length - 4 })
    visibleItems.push(...completed.slice(-2))
  } else {
    visibleItems.push(...completed)
  }

  // Active (always visible)
  visibleItems.push(...active)

  // Upcoming (collapse if >3)
  if (!showAllUpcoming && upcoming.length > 3) {
    visibleItems.push(...upcoming.slice(0, 3))
    visibleItems.push({ _type: 'collapsed-upcoming', count: upcoming.length - 3 })
  } else {
    visibleItems.push(...upcoming)
  }

  return (
    <div className="relative pl-7 sm:pl-8">
      {/* Vertical connecting line */}
      <div className="absolute bottom-0 left-3 top-0 w-0.5 bg-ff-border" />

      <div className="grid gap-4">
        {visibleItems.map((item, i) => {
          if (item._type === 'collapsed-completed') {
            return (
              <CollapseToggle
                key="collapse-completed"
                count={item.count}
                label="completed"
                onClick={() => setShowAllCompleted(true)}
              />
            )
          }

          if (item._type === 'collapsed-upcoming') {
            return (
              <CollapseToggle
                key="collapse-upcoming"
                count={item.count}
                label="upcoming"
                onClick={() => setShowAllUpcoming(true)}
              />
            )
          }

          const status = getGenStatus(item)
          const config = STATUS_CONFIG[status]

          return (
            <div key={item.generation_id} ref={item.is_active ? activeRef : undefined} className="relative">
              {/* Dot on the line */}
              <div className="absolute -left-7 top-4 flex h-5 w-5 items-center justify-center sm:-left-8">
                {item.is_active && (
                  <span className="absolute h-5 w-5 animate-ping rounded-full bg-ff-yellow/30 motion-reduce:animate-none" />
                )}
                <span className={`relative block h-3.5 w-3.5 rounded-full ${config.dot}`} />
              </div>

              <TimelineCard gen={item} legacyId={legacyId} status={status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
