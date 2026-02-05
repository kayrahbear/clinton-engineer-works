const ACCENT_CLASS = {
  mint: 'text-ff-mint',
  pink: 'text-ff-pink',
  yellow: 'text-ff-yellow',
  lilac: 'text-ff-lilac2',
}

export default function StatCard({ title, value, detail, badge, accent = 'mint' }) {
  const accentClass = ACCENT_CLASS[accent] ?? ACCENT_CLASS.mint

  return (
    <div className="ff-card ff-card-hover relative overflow-hidden p-4">
      <span
        className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-ff-surface2/80 text-sm shadow-soft ${accentClass}`}
      >
        {badge}
      </span>
      <p className="text-xs uppercase tracking-[0.25em] text-ff-subtle">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-ff-text">{value}</p>
      {detail && <p className="mt-1 text-xs text-ff-muted">{detail}</p>}
    </div>
  )
}
