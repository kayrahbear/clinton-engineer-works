import { useId } from 'react'

const clampPercent = (value) => {
  if (Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export default function GoalProgressRing({ percent = 0, size = 140, stroke = 10, label, sublabel }) {
  const safePercent = clampPercent(percent)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - safePercent / 100)
  const gradientId = useId()

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c2ffdf" />
              <stop offset="60%" stopColor="#f9f158" />
              <stop offset="100%" stopColor="#ffb8d1" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            className="fill-none stroke-ff-surface2/70"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            stroke={`url(#${gradientId})`}
            strokeLinecap="round"
            className="fill-none transition-all duration-700"
            style={{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset: dashOffset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold text-ff-text">{Math.round(safePercent)}%</span>
          <span className="text-[11px] uppercase tracking-[0.3em] text-ff-subtle">Complete</span>
        </div>
      </div>
      {(label || sublabel) && (
        <div className="text-center">
          {label && <p className="text-sm font-semibold text-ff-text">{label}</p>}
          {sublabel && <p className="text-xs text-ff-muted">{sublabel}</p>}
        </div>
      )}
    </div>
  )
}
