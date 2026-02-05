import { Link } from 'react-router-dom'

const referenceData = {
  lifeStages: ['infant', 'toddler', 'child', 'teen', 'young adult', 'adult', 'elder'],
  occults: ['human', 'vampire', 'spellcaster', 'werewolf', 'mermaid'],
  traits: ['Creative', 'Romantic', 'Self-Assured', 'Bookworm', 'Ambitious'],
  aspirations: ['City Native', 'Painter Extraordinaire', 'Best-Selling Author'],
  careers: ['Social Media', 'Painter', 'Writer', 'Tech Guru'],
  worlds: ['San Myshuno', 'Willow Creek', 'Sulani', 'Moonwood Mill'],
}

export default function SimForm() {
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Create Sim</p>
          <h2 className="text-2xl font-semibold text-ff-text">Add a new legacy sim</h2>
          <p className="mt-2 text-sm text-ff-muted">
            Capture the basics now and refine details later with traits, skills, and story updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/sims" className="ff-btn-secondary">
            Cancel
          </Link>
          <button className="ff-btn">Save Sim</button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Core details</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">First name</span>
                <input className="ff-input text-sm" placeholder="Sofia" />
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Last name</span>
                <input className="ff-input text-sm" placeholder="Sterling" />
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Generation</span>
                <input className="ff-input text-sm" placeholder="3" type="number" />
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">World</span>
                <select className="ff-input text-sm">
                  {referenceData.worlds.map((world) => (
                    <option key={world}>{world}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Life stage & occult</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Life stage</span>
                <select className="ff-input text-sm">
                  {referenceData.lifeStages.map((stage) => (
                    <option key={stage}>{stage}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Occult type</span>
                <select className="ff-input text-sm">
                  {referenceData.occults.map((occult) => (
                    <option key={occult}>{occult}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="ff-chip text-xs">Heir</span>
              <span className="ff-chip text-xs text-ff-lilac2">Living</span>
              <span className="ff-chip text-xs text-ff-pink">Household member</span>
            </div>
          </div>

          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Personality picks</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Primary trait</span>
                <select className="ff-input text-sm">
                  {referenceData.traits.map((trait) => (
                    <option key={trait}>{trait}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Secondary trait</span>
                <select className="ff-input text-sm">
                  {referenceData.traits.map((trait) => (
                    <option key={trait}>{trait}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Aspiration</span>
                <select className="ff-input text-sm">
                  {referenceData.aspirations.map((aspiration) => (
                    <option key={aspiration}>{aspiration}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Career focus</span>
                <select className="ff-input text-sm">
                  {referenceData.careers.map((career) => (
                    <option key={career}>{career}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <aside className="grid gap-6">
          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Portrait upload</h3>
            <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ff-border/70 bg-ff-surface2/50 p-6 text-center text-sm text-ff-muted">
              <div className="h-20 w-20 rounded-full border border-ff-mint/40 bg-gradient-to-br from-ff-pink/40 via-ff-mint/40 to-ff-lilac/60" />
              <p>Drag & drop or click to upload</p>
              <button className="ff-btn-secondary">Choose file</button>
            </div>
          </div>

          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Notes</h3>
            <textarea
              className="ff-input mt-4 min-h-[140px] text-sm"
              placeholder="Add a quick backstory or reminder."
            />
          </div>
        </aside>
      </section>
    </div>
  )
}