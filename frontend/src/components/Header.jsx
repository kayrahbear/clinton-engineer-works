import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Sims', to: '/sims' },
  { label: 'Legacy', to: '/legacy' },
]

export default function Header() {
  return (
    <header className="border-b border-ff-border/70 bg-ff-surface/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-ff-muted">
            Sims Legacy Tracker
          </p>
          <h1 className="text-2xl font-semibold text-ff-text">Your story timeline</h1>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-3 py-1 font-medium transition ${
                  isActive
                    ? 'border border-ff-mint/40 bg-ff-mint/15 text-ff-mint'
                    : 'text-ff-muted hover:text-ff-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}