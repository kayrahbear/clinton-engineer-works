import { NavLink } from 'react-router-dom'

const sideLinks = [
  { label: 'Legacy dashboard', to: '/legacy' },
  { label: 'Sims roster', to: '/sims' },
  { label: 'Generation timeline', to: '/legacy#timeline' },
]

export default function Sidebar() {
  return (
    <aside className="ff-card hidden w-full max-w-[220px] flex-col gap-4 p-5 text-sm text-ff-muted md:flex">
      <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Workspace</p>
      <nav className="flex flex-col gap-2">
        {sideLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 transition ${
                isActive
                  ? 'border border-ff-mint/40 bg-ff-mint/10 text-ff-mint'
                  : 'hover:bg-ff-surface2/70 hover:text-ff-text'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="rounded-xl border border-dashed border-ff-border/70 bg-ff-surface2/40 p-3 text-xs text-ff-muted">
        <p className="font-semibold text-ff-text">Phase 1 focus</p>
        <p className="mt-1">
          Routing, layout, and API integration.
        </p>
      </div>
    </aside>
  )
}