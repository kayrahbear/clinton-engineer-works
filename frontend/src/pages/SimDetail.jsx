import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Modal from '../components/Modal'

const tabs = ['Overview', 'Traits', 'Skills', 'Career', 'Relationships', 'Story']

const simData = {
  id: 'sim-1',
  name: 'Sofia Sterling',
  generation: 3,
  lifeStage: 'young adult',
  occult: 'human',
  isHeir: true,
  aspiration: {
    name: 'City Native',
    progress: 0.78,
  },
  traits: ['Creative', 'Romantic', 'Self-Assured'],
  skills: [
    { name: 'Charisma', level: 8 },
    { name: 'Painting', level: 10 },
    { name: 'Wellness', level: 5 },
  ],
  career: {
    title: 'Social Media Maven',
    level: 'Rising Star',
    branch: 'Public Relations',
  },
  relationships: [
    { name: 'Elena Sterling', type: 'Sister', status: 'Close' },
    { name: 'Marco Sterling', type: 'Father', status: 'Mentor' },
    { name: 'Juniper Sterling', type: 'Grandmother', status: 'Beloved' },
  ],
  story:
    'Sofia is the heartbeat of the Sterling legacy—painting neon sunsets, hosting midnight gallery parties, and journaling every twist in her city-native dream.',
  lastUpdated: '2 days ago',
}

const modalData = {
  traits: ['Creative', 'Romantic', 'Self-Assured', 'Bookworm', 'Ambitious'],
  skills: ['Charisma', 'Painting', 'Wellness', 'Logic', 'Fitness'],
  aspirations: ['City Native', 'Painter Extraordinaire', 'Best-Selling Author'],
  careers: ['Social Media', 'Painter', 'Writer', 'Tech Guru'],
}

export default function SimDetail() {
  const { id } = useParams()  // Get real sim ID from URL
  const [activeTab, setActiveTab] = useState('Overview')
  const [activeModal, setActiveModal] = useState(null)
  const relationshipCount = useMemo(() => simData.relationships.length, [])

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border border-ff-mint/40 bg-gradient-to-br from-ff-pink/40 via-ff-mint/40 to-ff-lilac/60 shadow-glowMint" />
            {simData.isHeir && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ff-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ff-mint">
                Heir
              </span>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Sim profile</p>
            <h2 className="text-3xl font-semibold text-ff-text">{simData.name}</h2>
            <p className="mt-2 text-sm text-ff-muted">
              Gen {simData.generation} · {simData.lifeStage} · {simData.occult}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {simData.traits.map((trait) => (
                <span key={trait} className="ff-chip text-xs">
                  {trait}
                </span>
              ))}
              <span className="ff-chip text-xs text-ff-pink">{simData.occult}</span>
              <span className="ff-chip text-xs text-ff-lilac2">{simData.lifeStage}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="ff-btn-secondary" onClick={() => setActiveModal('trait')}>
            + Add Trait
          </button>
          <button className="ff-btn-secondary" onClick={() => setActiveModal('skill')}>
            + Add Skill
          </button>
          <button className="ff-btn-secondary" onClick={() => setActiveModal('aspiration')}>
            + Add Aspiration
          </button>
          <button className="ff-btn-secondary" onClick={() => setActiveModal('career')}>
            + Add Career
          </button>
          <button className="ff-btn">✨ Ask AI about this Sim</button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-3 border-b border-ff-border/70 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              activeTab === tab
                ? 'bg-ff-surface2 text-ff-text shadow-glowMint'
                : 'text-ff-muted hover:text-ff-text'
            }`}
          >
            <span className="relative">
              {tab}
              {activeTab === tab && (
                <span className="absolute -bottom-2 left-0 h-0.5 w-full rounded-full bg-gradient-to-r from-ff-pink via-ff-mint to-ff-yellow" />
              )}
            </span>
          </button>
        ))}
      </nav>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          {activeTab === 'Overview' && (
            <>
              <div className="ff-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-ff-text">Overview</h3>
                    <p className="mt-1 text-sm text-ff-muted">
                      Snapshot of aspirations, career, and key relationships.
                    </p>
                  </div>
                  <Link className="text-xs uppercase tracking-[0.2em] text-ff-mint" to="/sims">
                    Back to roster
                  </Link>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Aspiration</p>
                <p className="mt-2 text-sm font-semibold text-ff-text">{simData.aspiration.name}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ff-surface">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ff-mint to-ff-yellow"
                    style={{ width: `${Math.round(simData.aspiration.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-ff-muted">
                  {Math.round(simData.aspiration.progress * 100)}% complete
                </p>
              </div>
              <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Career</p>
                <p className="mt-2 text-sm font-semibold text-ff-text">{simData.career.title}</p>
                <p className="mt-2 text-xs text-ff-muted">
                  {simData.career.level} · {simData.career.branch}
                </p>
                <button className="mt-3 ff-btn-secondary">Update career</button>
              </div>
              <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Relationships</p>
                <p className="mt-2 text-sm font-semibold text-ff-text">
                  {relationshipCount} key bonds
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {simData.relationships.map((relation) => (
                    <span key={relation.name} className="ff-chip text-xs">
                      {relation.type}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Skills</p>
                <p className="mt-2 text-sm font-semibold text-ff-text">
                  {simData.skills.length} showcased skills
                </p>
                <div className="mt-3 space-y-2 text-xs text-ff-muted">
                  {simData.skills.map((skill) => (
                    <div key={skill.name} className="flex items-center justify-between">
                      <span>{skill.name}</span>
                      <span className="text-ff-text">Lvl {skill.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

              <div className="ff-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-ff-text">Family ties</h3>
                  <Link to={`/sims/${id}/family-tree`} className="text-xs uppercase tracking-[0.2em] text-ff-lilac2 hover:text-ff-mint transition">View tree</Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {simData.relationships.map((relation) => (
                    <div
                      key={relation.name}
                      className="rounded-xl border border-ff-border/70 bg-ff-surface2/50 p-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">{relation.type}</p>
                      <p className="mt-2 text-sm font-semibold text-ff-text">{relation.name}</p>
                      <p className="mt-1 text-xs text-ff-muted">{relation.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'Skills' && (
            <div className="ff-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ff-text">Skills</h3>
                  <p className="mt-1 text-sm text-ff-muted">
                    Track progress and proficiency across all skill categories.
                  </p>
                </div>
                <button className="ff-btn-secondary" onClick={() => setActiveModal('skill')}>
                  + Add Skill
                </button>
              </div>
              <div className="mt-6 space-y-4">
                {simData.skills.map((skill) => (
                  <div key={skill.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-ff-text">{skill.name}</span>
                      <span className="text-xs text-ff-muted">
                        Level {skill.level} / 10
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-ff-surface2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ff-mint via-ff-lilac2 to-ff-pink transition-all"
                        style={{ width: `${(skill.level / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Traits' && (
            <div className="ff-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ff-text">Personality Traits</h3>
                  <p className="mt-1 text-sm text-ff-muted">
                    Core characteristics that shape behavior and interactions.
                  </p>
                </div>
                <button className="ff-btn-secondary" onClick={() => setActiveModal('trait')}>
                  + Add Trait
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {simData.traits.map((trait) => (
                  <div
                    key={trait}
                    className="group rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-surface2/60 to-ff-surface2/40 p-5 transition hover:border-ff-mint/40 hover:shadow-glowMint"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-ff-text">{trait}</h4>
                      <span className="text-2xl opacity-50 transition group-hover:opacity-100">
                        ✨
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ff-muted">
                      Influences social interactions and autonomous behaviors.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Career' && (
            <div className="ff-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ff-text">Career Path</h3>
                  <p className="mt-1 text-sm text-ff-muted">
                    Professional journey and current employment status.
                  </p>
                </div>
                <button className="ff-btn-secondary" onClick={() => setActiveModal('career')}>
                  + Add Career
                </button>
              </div>
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-mint/10 via-ff-surface2/60 to-ff-lilac/10 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Current Position</p>
                      <h4 className="mt-2 text-xl font-semibold text-ff-text">{simData.career.title}</h4>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="ff-chip text-xs text-ff-mint">{simData.career.level}</span>
                        <span className="text-xs text-ff-muted">·</span>
                        <span className="ff-chip text-xs text-ff-lilac2">{simData.career.branch}</span>
                      </div>
                    </div>
                    <div className="text-3xl">💼</div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ff-muted">Career Progress</span>
                      <span className="font-semibold text-ff-text">Level 7 / 10</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-ff-surface">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ff-mint to-ff-yellow transition-all"
                        style={{ width: '70%' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Work Performance</p>
                    <p className="mt-2 text-lg font-semibold text-ff-text">Excellent</p>
                    <p className="mt-2 text-xs text-ff-muted">Ready for promotion</p>
                  </div>
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Daily Earnings</p>
                    <p className="mt-2 text-lg font-semibold text-ff-text">§2,400</p>
                    <p className="mt-2 text-xs text-ff-muted">Per work day</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Relationships' && (
            <div className="ff-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ff-text">Relationships</h3>
                  <p className="mt-1 text-sm text-ff-muted">
                    Family bonds, friendships, and social connections.
                  </p>
                </div>
                <button className="ff-btn-secondary">+ Add Relationship</button>
              </div>
              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle mb-4">Family</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {simData.relationships.map((relation) => (
                      <div
                        key={relation.name}
                        className="group rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-pink/5 via-ff-surface2/60 to-ff-mint/5 p-5 transition hover:border-ff-pink/40 hover:shadow-glowMint"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-full border border-ff-pink/40 bg-gradient-to-br from-ff-pink/30 to-ff-lilac/30" />
                              <div>
                                <h4 className="text-sm font-semibold text-ff-text">{relation.name}</h4>
                                <p className="text-xs text-ff-muted">{relation.type}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span className="ff-chip text-xs text-ff-pink">{relation.status}</span>
                            </div>
                          </div>
                          <span className="text-xl opacity-50 transition group-hover:opacity-100">
                            💕
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Story' && (
            <div className="ff-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ff-text">Story Journal</h3>
                  <p className="mt-1 text-sm text-ff-muted">
                    Chronicle your sim's adventures, memories, and narrative moments.
                  </p>
                </div>
                <button className="ff-btn">✨ Generate a scene</button>
              </div>
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-yellow/5 via-ff-surface2/60 to-ff-mint/5 p-6">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">📖</span>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-ff-text">Current Chapter</h4>
                      <p className="mt-3 text-sm leading-relaxed text-ff-text">
                        {simData.story}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-ff-muted">
                        <span>Last updated {simData.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Story Tools</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4 text-left transition hover:border-ff-mint/40 hover:shadow-glowMint">
                      <p className="text-sm font-semibold text-ff-text">Add a memory</p>
                      <p className="mt-1 text-xs text-ff-muted">Document a special moment or event</p>
                    </button>
                    <button className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4 text-left transition hover:border-ff-mint/40 hover:shadow-glowMint">
                      <p className="text-sm font-semibold text-ff-text">Write a note</p>
                      <p className="mt-1 text-xs text-ff-muted">Capture thoughts or reminders</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="grid gap-6">
          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Story journal</h3>
            <p className="mt-3 text-sm text-ff-muted">{simData.story}</p>
            <button className="mt-4 ff-btn">✨ Generate a scene</button>
          </div>

          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Detail log</h3>
            <div className="mt-3 space-y-2 text-xs text-ff-muted">
              <div className="flex items-center justify-between">
                <span>Last updated</span>
                <span className="text-ff-text">{simData.lastUpdated}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Occult type</span>
                <span className="text-ff-text">{simData.occult}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Life stage</span>
                <span className="text-ff-text">{simData.lifeStage}</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <Modal
        title="Add a new trait"
        description="Search for a personality trait to add to this sim."
        isOpen={activeModal === 'trait'}
        onClose={() => setActiveModal(null)}
      >
        <div className="grid gap-4">
          <input className="ff-input text-sm" placeholder="Search traits" />
          <div className="flex flex-wrap gap-2">
            {modalData.traits.map((trait) => (
              <button key={trait} className="ff-chip text-xs" type="button">
                {trait}
              </button>
            ))}
          </div>
          <button className="ff-btn">Add selected trait</button>
        </div>
      </Modal>

      <Modal
        title="Add a skill"
        description="Pick a skill and set a starting level."
        isOpen={activeModal === 'skill'}
        onClose={() => setActiveModal(null)}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Skill</span>
            <select className="ff-input text-sm">
              {modalData.skills.map((skill) => (
                <option key={skill}>{skill}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Level</span>
            <input className="ff-input text-sm" max="10" min="1" type="range" />
          </label>
          <button className="ff-btn">Add skill</button>
        </div>
      </Modal>

      <Modal
        title="Add an aspiration"
        description="Select a new aspiration to track."
        isOpen={activeModal === 'aspiration'}
        onClose={() => setActiveModal(null)}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Aspiration</span>
            <select className="ff-input text-sm">
              {modalData.aspirations.map((aspiration) => (
                <option key={aspiration}>{aspiration}</option>
              ))}
            </select>
          </label>
          <button className="ff-btn">Add aspiration</button>
        </div>
      </Modal>

      <Modal
        title="Add a career"
        description="Choose a career track and branch."
        isOpen={activeModal === 'career'}
        onClose={() => setActiveModal(null)}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Career</span>
            <select className="ff-input text-sm">
              {modalData.careers.map((career) => (
                <option key={career}>{career}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Branch</span>
            <input className="ff-input text-sm" placeholder="e.g. Public Relations" />
          </label>
          <button className="ff-btn">Add career</button>
        </div>
      </Modal>
    </div>
  )
}