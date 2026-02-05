import { NavLink, Link } from 'react-router-dom'
import { useActiveLegacy } from '../context/useActiveLegacy'

const sideLinks = [
  { label: 'Legacy dashboard', to: '/legacy' },
  { label: 'Sims roster', to: '/sims' },
  { label: 'Generation timeline', to: '/legacy#timeline' },
]

export default function Sidebar() {
  const { legacies, activeLegacyId, setActiveLegacyId, loading } = useActiveLegacy()

  return (
    <aside className="ff-card hidden w-full max-w-[220px] flex-col gap-4 p-5 text-sm text-ff-muted md:flex">
      <Link
        to="/legacy/new"
        className="ff-btn w-full text-center"
      >
        + New Legacy
      </Link>
      <label className="grid gap-1 text-xs text-ff-muted">
        <span className="uppercase tracking-[0.2em] text-ff-subtle">Active legacy</span>
        <select
          className="ff-input py-1.5 text-xs"
          value={activeLegacyId}
          onChange={(event) => setActiveLegacyId(event.target.value)}
          disabled={loading || legacies.length === 0}
        >
          {legacies.length === 0 ? <option value="">No legacies yet</option> : null}
          {legacies.map((legacy) => (
            <option key={legacy.legacy_id} value={legacy.legacy_id}>
              {legacy.legacy_name}
            </option>
          ))}
        </select>
      </label>
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
        <p className="font-semibold text-ff-text">Phase 3</p>
        <p className="mt-1">
          Legacy & generation tracking.
        </p>
      </div>
    </aside>
  )
}
