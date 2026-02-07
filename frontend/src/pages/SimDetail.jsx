import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'

const tabs = ['Overview', 'Traits', 'Skills', 'Career', 'Relationships', 'Story']

const toLabel = (value) => {
  if (!value) return 'Unknown'
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const formatDate = (value) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default function SimDetail() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('Overview')
  const [activeModal, setActiveModal] = useState(null)
  const [newSkillLevel, setNewSkillLevel] = useState(1)
  const [selectedTraitId, setSelectedTraitId] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [selectedAspirationId, setSelectedAspirationId] = useState('')
  const [selectedCareerId, setSelectedCareerId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [availableBranches, setAvailableBranches] = useState([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [updateCareerForm, setUpdateCareerForm] = useState({
    current_level: 1,
    branch_id: '',
    is_current: true,
    is_completed: false,
    completion_date: '',
  })

  const [state, setState] = useState({
    loading: true,
    error: null,
    sim: null,
    generation: null,
    traits: [],
    skills: [],
    aspirations: [],
    careers: [],
    relationships: [],
    referenceTraits: [],
    referenceSkills: [],
    referenceAspirations: [],
    referenceCareers: [],
  })

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))

        const simResponse = await apiClient.get(`/sims/${id}`)
        const sim = simResponse.data

        const [
          generationResponse,
          traitsResponse,
          skillsResponse,
          aspirationsResponse,
          careersResponse,
          relationshipsResponse,
          referenceTraitsResponse,
          referenceSkillsResponse,
          referenceAspirationsResponse,
          referenceCareersResponse,
        ] = await Promise.all([
          sim?.generation_id ? apiClient.get(`/generations/${sim.generation_id}`).catch(() => null) : null,
          apiClient.get(`/sims/${id}/traits`),
          apiClient.get(`/sims/${id}/skills`),
          apiClient.get(`/sims/${id}/aspirations`),
          apiClient.get(`/sims/${id}/careers`),
          apiClient.get(`/sims/${id}/relationships`),
          apiClient.get('/reference/traits').catch(() => ({ data: [] })),
          apiClient.get('/reference/skills').catch(() => ({ data: [] })),
          apiClient.get('/reference/aspirations').catch(() => ({ data: [] })),
          apiClient.get('/reference/careers').catch(() => ({ data: [] })),
        ])

        if (!isMounted) return

        setState({
          loading: false,
          error: null,
          sim,
          generation: generationResponse?.data ?? null,
          traits: traitsResponse.data || [],
          skills: skillsResponse.data || [],
          aspirations: aspirationsResponse.data || [],
          careers: careersResponse.data || [],
          relationships: relationshipsResponse.data || [],
          referenceTraits: referenceTraitsResponse.data || [],
          referenceSkills: referenceSkillsResponse.data || [],
          referenceAspirations: referenceAspirationsResponse.data || [],
          referenceCareers: referenceCareersResponse.data || [],
        })
      } catch (error) {
        if (!isMounted) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.data?.error || error?.message || 'Failed to load sim details',
        }))
      }
    }

    if (!id) {
      setState((prev) => ({ ...prev, loading: false, error: 'Missing sim id' }))
      return () => {}
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [id])

  const fetchBranches = async (careerId) => {
    if (!careerId) {
      setAvailableBranches([])
      return
    }
    const career = state.referenceCareers.find((c) => c.career_id === careerId)
    if (!career?.has_branches) {
      setAvailableBranches([])
      return
    }
    setLoadingBranches(true)
    try {
      const response = await apiClient.get(`/reference/careers/${careerId}/branches`)
      setAvailableBranches(response.data || [])
    } catch {
      setAvailableBranches([])
    } finally {
      setLoadingBranches(false)
    }
  }

  useEffect(() => {
    setSelectedBranchId('')
    fetchBranches(selectedCareerId)
  }, [selectedCareerId])

  const handleAddTrait = async () => {
    if (!selectedTraitId) return
    try {
      await apiClient.post(`/sims/${id}/traits`, { trait_id: selectedTraitId })
      const refreshed = await apiClient.get(`/sims/${id}/traits`)
      setState((prev) => ({ ...prev, traits: refreshed.data || [] }))
      setActiveModal(null)
      setSelectedTraitId('')
    } catch (error) {
      window.alert(error?.data?.error || error?.message || 'Failed to add trait')
    }
  }

  const handleAddSkill = async () => {
    if (!selectedSkillId) return
    try {
      await apiClient.post(`/sims/${id}/skills`, { skill_id: selectedSkillId, current_level: newSkillLevel })
      const refreshed = await apiClient.get(`/sims/${id}/skills`)
      setState((prev) => ({ ...prev, skills: refreshed.data || [] }))
      setActiveModal(null)
      setSelectedSkillId('')
      setNewSkillLevel(1)
    } catch (error) {
      window.alert(error?.data?.error || error?.message || 'Failed to add skill')
    }
  }

  const handleAddAspiration = async () => {
    if (!selectedAspirationId) return
    try {
      await apiClient.post(`/sims/${id}/aspirations`, { aspiration_id: selectedAspirationId })
      const refreshed = await apiClient.get(`/sims/${id}/aspirations`)
      setState((prev) => ({ ...prev, aspirations: refreshed.data || [] }))
      setActiveModal(null)
      setSelectedAspirationId('')
    } catch (error) {
      window.alert(error?.data?.error || error?.message || 'Failed to add aspiration')
    }
  }

  const handleAddCareer = async () => {
    if (!selectedCareerId) return
    try {
      const body = { career_id: selectedCareerId }
      if (selectedBranchId) body.branch_id = selectedBranchId
      await apiClient.post(`/sims/${id}/careers`, body)
      const refreshed = await apiClient.get(`/sims/${id}/careers`)
      setState((prev) => ({ ...prev, careers: refreshed.data || [] }))
      setActiveModal(null)
      setSelectedCareerId('')
      setSelectedBranchId('')
    } catch (error) {
      window.alert(error?.data?.error || error?.message || 'Failed to add career')
    }
  }

  const openUpdateCareerModal = async (career) => {
    setUpdateCareerForm({
      sim_career_id: career.sim_career_id,
      career_id: career.career_id,
      current_level: career.current_level || 1,
      branch_id: career.branch_id || '',
      is_current: career.is_current ?? true,
      is_completed: career.is_completed ?? false,
      completion_date: career.completion_date ? career.completion_date.split('T')[0] : '',
    })
    const ref = state.referenceCareers.find((c) => c.career_id === career.career_id)
    if (ref?.has_branches) {
      setLoadingBranches(true)
      try {
        const response = await apiClient.get(`/reference/careers/${career.career_id}/branches`)
        setAvailableBranches(response.data || [])
      } catch {
        setAvailableBranches([])
      } finally {
        setLoadingBranches(false)
      }
    } else {
      setAvailableBranches([])
    }
    setActiveModal('updateCareer')
  }

  const handleUpdateCareer = async () => {
    try {
      const body = {}
      if (updateCareerForm.current_level !== undefined) body.current_level = updateCareerForm.current_level
      if (updateCareerForm.branch_id) body.branch_id = updateCareerForm.branch_id
      body.is_current = updateCareerForm.is_current
      body.is_completed = updateCareerForm.is_completed
      body.completion_date = updateCareerForm.is_completed && updateCareerForm.completion_date
        ? updateCareerForm.completion_date
        : null
      await apiClient.put(`/sims/${id}/careers/${updateCareerForm.sim_career_id}`, body)
      const refreshed = await apiClient.get(`/sims/${id}/careers`)
      setState((prev) => ({ ...prev, careers: refreshed.data || [] }))
      setActiveModal(null)
    } catch (error) {
      window.alert(error?.data?.error || error?.message || 'Failed to update career')
    }
  }

  const relationshipCount = useMemo(() => state.relationships.length, [state.relationships])

  if (state.loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner label="Loading sim profile" />
      </div>
    )
  }

  if (state.error) {
    return (
      <ErrorState
        title="Failed to load sim"
        message={state.error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  const sim = state.sim
  const currentAspiration = state.aspirations.find((aspiration) => aspiration.is_current) || state.aspirations[0]
  const currentCareer = state.careers.find((career) => career.is_current) || state.careers[0]
  const storyText = sim.notes || 'No story notes yet. Add details to build this sim\'s legacy journal.'
  const updatedAt = sim.updated_at || sim.created_at

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full border border-ff-mint/40 bg-gradient-to-br from-ff-pink/40 via-ff-mint/40 to-ff-lilac/60 shadow-glowMint">
              {sim.portrait ? (
                <img src={sim.portrait} alt={sim.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            {sim.is_generation_heir && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ff-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ff-mint">
                Heir
              </span>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Sim profile</p>
            <h2 className="text-3xl font-semibold text-ff-text">{sim.name}</h2>
            <p className="mt-2 text-sm text-ff-muted">
              Gen {state.generation?.generation_number ?? '?'} · {toLabel(sim.life_stage)} · {toLabel(sim.occult_type)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.traits.map((trait) => (
                <span key={trait.trait_id} className="ff-chip text-xs">
                  {trait.trait_name}
                </span>
              ))}
              <span className="ff-chip text-xs text-ff-pink">{toLabel(sim.occult_type)}</span>
              <span className="ff-chip text-xs text-ff-lilac2">{toLabel(sim.life_stage)}</span>
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
              activeTab === tab ? 'bg-ff-surface2 text-ff-text shadow-glowMint' : 'text-ff-muted hover:text-ff-text'
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
                    <p className="mt-1 text-sm text-ff-muted">Snapshot of aspirations, career, and key relationships.</p>
                  </div>
                  <Link className="text-xs uppercase tracking-[0.2em] text-ff-mint" to="/sims">
                    Back to roster
                  </Link>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Aspiration</p>
                    <p className="mt-2 text-sm font-semibold text-ff-text">
                      {currentAspiration?.aspiration_name ?? 'No aspiration assigned'}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-ff-surface">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ff-mint to-ff-yellow"
                        style={{ width: currentAspiration?.is_completed ? '100%' : '0%' }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-ff-muted">
                      {currentAspiration ? (currentAspiration.is_completed ? 'Completed' : 'In progress') : 'No progress yet'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Career</p>
                    <p className="mt-2 text-sm font-semibold text-ff-text">{currentCareer?.career_name ?? 'No career assigned'}</p>
                    <p className="mt-2 text-xs text-ff-muted">
                      {currentCareer ? `Level ${currentCareer.current_level} · ${currentCareer.branch_name || 'No branch selected'}` : 'No active career yet'}
                    </p>
                    <button className="mt-3 ff-btn-secondary" disabled={!currentCareer} onClick={() => openUpdateCareerModal(currentCareer)}>Update career</button>
                  </div>
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Relationships</p>
                    <p className="mt-2 text-sm font-semibold text-ff-text">{relationshipCount} key bonds</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {state.relationships.map((relation) => (
                        <span key={relation.relationship_id} className="ff-chip text-xs">
                          {toLabel(relation.relationship_type)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Skills</p>
                    <p className="mt-2 text-sm font-semibold text-ff-text">{state.skills.length} showcased skills</p>
                    <div className="mt-3 space-y-2 text-xs text-ff-muted">
                      {state.skills.map((skill) => (
                        <div key={skill.skill_id} className="flex items-center justify-between">
                          <span>{skill.skill_name}</span>
                          <span className="text-ff-text">Lvl {skill.current_level}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ff-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-ff-text">Family ties</h3>
                  <Link
                    to={`/sims/${id}/family-tree`}
                    className="text-xs uppercase tracking-[0.2em] text-ff-lilac2 transition hover:text-ff-mint"
                  >
                    View tree
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {state.relationships.map((relation) => (
                    <div key={relation.relationship_id} className="rounded-xl border border-ff-border/70 bg-ff-surface2/50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">{toLabel(relation.relationship_type)}</p>
                      <p className="mt-2 text-sm font-semibold text-ff-text">{relation.related_sim_name}</p>
                      <p className="mt-1 text-xs text-ff-muted">{relation.is_active ? 'Active' : 'Past'}</p>
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
                  <p className="mt-1 text-sm text-ff-muted">Track progress and proficiency across all skill categories.</p>
                </div>
                <button className="ff-btn-secondary" onClick={() => setActiveModal('skill')}>
                  + Add Skill
                </button>
              </div>
              <div className="mt-6 space-y-4">
                {state.skills.map((skill) => (
                  <div key={skill.skill_id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-ff-text">{skill.skill_name}</span>
                      <span className="text-xs text-ff-muted">
                        Level {skill.current_level} / {skill.max_level}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-ff-surface2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ff-mint via-ff-lilac2 to-ff-pink transition-all"
                        style={{ width: `${(skill.current_level / skill.max_level) * 100}%` }}
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
                  <p className="mt-1 text-sm text-ff-muted">Core characteristics that shape behavior and interactions.</p>
                </div>
                <button className="ff-btn-secondary" onClick={() => setActiveModal('trait')}>
                  + Add Trait
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {state.traits.map((trait) => (
                  <div
                    key={trait.trait_id}
                    className="group rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-surface2/60 to-ff-surface2/40 p-5 transition hover:border-ff-mint/40 hover:shadow-glowMint"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-ff-text">{trait.trait_name}</h4>
                      <span className="text-2xl opacity-50 transition group-hover:opacity-100">✨</span>
                    </div>
                    <p className="mt-2 text-xs text-ff-muted">{toLabel(trait.trait_type)} trait.</p>
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
                  <p className="mt-1 text-sm text-ff-muted">Professional journey and current employment status.</p>
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
                      <h4 className="mt-2 text-xl font-semibold text-ff-text">{currentCareer?.career_name ?? 'No current career'}</h4>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {currentCareer ? (
                          <>
                            <span className="ff-chip text-xs text-ff-mint">Level {currentCareer.current_level}</span>
                            <span className="text-xs text-ff-muted">·</span>
                            <span className="ff-chip text-xs text-ff-lilac2">{currentCareer.branch_name || 'No branch selected'}</span>
                          </>
                        ) : (
                          <span className="text-xs text-ff-muted">Start a career to track progress here.</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-3xl">💼</div>
                      {currentCareer && (
                        <button className="ff-btn-secondary text-xs" onClick={() => openUpdateCareerModal(currentCareer)}>Update</button>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ff-muted">Career Progress</span>
                      <span className="font-semibold text-ff-text">
                        {currentCareer ? `Level ${currentCareer.current_level} / ${currentCareer.max_level}` : 'No progress yet'}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-ff-surface">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ff-mint to-ff-yellow transition-all"
                        style={{
                          width: currentCareer
                            ? `${(currentCareer.current_level / currentCareer.max_level) * 100}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Career Type</p>
                    <p className="mt-2 text-lg font-semibold text-ff-text">{toLabel(currentCareer?.career_type)}</p>
                    <p className="mt-2 text-xs text-ff-muted">Category from reference data</p>
                  </div>
                  <div className="rounded-xl border border-ff-border/70 bg-ff-surface2/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Career Completed</p>
                    <p className="mt-2 text-lg font-semibold text-ff-text">{currentCareer?.is_completed ? 'Yes' : 'No'}</p>
                    <p className="mt-2 text-xs text-ff-muted">
                      {currentCareer?.completion_date ? formatDate(currentCareer.completion_date) : 'Not completed yet'}
                    </p>
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
                  <p className="mt-1 text-sm text-ff-muted">Family bonds, friendships, and social connections.</p>
                </div>
                <button className="ff-btn-secondary">+ Add Relationship</button>
              </div>
              <div className="mt-6 space-y-6">
                <div>
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] text-ff-subtle">Connections</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {state.relationships.map((relation) => (
                      <div
                        key={relation.relationship_id}
                        className="group rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-pink/5 via-ff-surface2/60 to-ff-mint/5 p-5 transition hover:border-ff-pink/40 hover:shadow-glowMint"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 overflow-hidden rounded-full border border-ff-pink/40 bg-gradient-to-br from-ff-pink/30 to-ff-lilac/30">
                                {relation.related_sim_portrait ? (
                                  <img
                                    src={relation.related_sim_portrait}
                                    alt={relation.related_sim_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-ff-text">{relation.related_sim_name}</h4>
                                <p className="text-xs text-ff-muted">{toLabel(relation.relationship_type)}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span className="ff-chip text-xs text-ff-pink">{relation.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                          </div>
                          <span className="text-xl opacity-50 transition group-hover:opacity-100">💕</span>
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
                  <p className="mt-1 text-sm text-ff-muted">Chronicle your sim's adventures, memories, and narrative moments.</p>
                </div>
                <button className="ff-btn">✨ Generate a scene</button>
              </div>
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-yellow/5 via-ff-surface2/60 to-ff-mint/5 p-6">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">📖</span>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-ff-text">Current Chapter</h4>
                      <p className="mt-3 text-sm leading-relaxed text-ff-text">{storyText}</p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-ff-muted">
                        <span>Last updated {formatDate(updatedAt)}</span>
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
            <p className="mt-3 text-sm text-ff-muted">{storyText}</p>
            <button className="mt-4 ff-btn">✨ Generate a scene</button>
          </div>

          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Detail log</h3>
            <div className="mt-3 space-y-2 text-xs text-ff-muted">
              <div className="flex items-center justify-between">
                <span>Last updated</span>
                <span className="text-ff-text">{formatDate(updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Occult type</span>
                <span className="text-ff-text">{toLabel(sim.occult_type)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Life stage</span>
                <span className="text-ff-text">{toLabel(sim.life_stage)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="text-ff-text">{toLabel(sim.status)}</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <Modal
        title="Add a new trait"
        description="Search for a personality trait to add to this sim."
        isOpen={activeModal === 'trait'}
        onClose={() => { setActiveModal(null); setSelectedTraitId('') }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Trait</span>
            <select className="ff-input text-sm" value={selectedTraitId} onChange={(e) => setSelectedTraitId(e.target.value)}>
              <option value="">Select a trait</option>
              {state.referenceTraits.map((trait) => (
                <option key={trait.trait_id} value={trait.trait_id}>{trait.trait_name}</option>
              ))}
            </select>
          </label>
          <button className="ff-btn" disabled={!selectedTraitId} onClick={handleAddTrait}>Add selected trait</button>
        </div>
      </Modal>

      <Modal
        title="Add a skill"
        description="Pick a skill and set a starting level."
        isOpen={activeModal === 'skill'}
        onClose={() => { setActiveModal(null); setSelectedSkillId(''); setNewSkillLevel(1) }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Skill</span>
            <select className="ff-input text-sm" value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)}>
              <option value="">Select a skill</option>
              {state.referenceSkills.map((skill) => (
                <option key={skill.skill_id} value={skill.skill_id}>{skill.skill_name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-ff-muted">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Level</span>
              <span className="text-ff-text">Level {newSkillLevel}</span>
            </div>
            <input
              className="ff-input text-sm"
              max="10"
              min="1"
              type="range"
              value={newSkillLevel}
              onChange={(event) => setNewSkillLevel(parseInt(event.target.value, 10))}
            />
          </label>
          <button className="ff-btn" disabled={!selectedSkillId} onClick={handleAddSkill}>Add skill</button>
        </div>
      </Modal>

      <Modal
        title="Add an aspiration"
        description="Select a new aspiration to track."
        isOpen={activeModal === 'aspiration'}
        onClose={() => { setActiveModal(null); setSelectedAspirationId('') }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Aspiration</span>
            <select className="ff-input text-sm" value={selectedAspirationId} onChange={(e) => setSelectedAspirationId(e.target.value)}>
              <option value="">Select an aspiration</option>
              {state.referenceAspirations.map((aspiration) => (
                <option key={aspiration.aspiration_id} value={aspiration.aspiration_id}>{aspiration.aspiration_name}</option>
              ))}
            </select>
          </label>
          <button className="ff-btn" disabled={!selectedAspirationId} onClick={handleAddAspiration}>Add aspiration</button>
        </div>
      </Modal>

      <Modal
        title="Add a career"
        description="Choose a career track and optional branch."
        isOpen={activeModal === 'career'}
        onClose={() => { setActiveModal(null); setSelectedCareerId(''); setSelectedBranchId(''); setAvailableBranches([]) }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Career</span>
            <select className="ff-input text-sm" value={selectedCareerId} onChange={(e) => setSelectedCareerId(e.target.value)}>
              <option value="">Select a career</option>
              {state.referenceCareers.map((career) => (
                <option key={career.career_id} value={career.career_id}>{career.career_name}</option>
              ))}
            </select>
          </label>
          {availableBranches.length > 0 && (
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Branch</span>
              <select className="ff-input text-sm" value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
                <option value="">Select a branch</option>
                {availableBranches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>{branch.branch_name}</option>
                ))}
              </select>
            </label>
          )}
          {loadingBranches && <p className="text-xs text-ff-muted">Loading branches...</p>}
          <button className="ff-btn" disabled={!selectedCareerId} onClick={handleAddCareer}>Add career</button>
        </div>
      </Modal>

      <Modal
        title="Update career"
        description="Edit career progression, branch, and completion status."
        isOpen={activeModal === 'updateCareer'}
        onClose={() => { setActiveModal(null); setAvailableBranches([]) }}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-xs text-ff-muted">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Current Level</span>
              <span className="text-ff-text">Level {updateCareerForm.current_level}</span>
            </div>
            <input
              className="ff-input text-sm"
              type="range"
              min="1"
              max={state.referenceCareers.find((c) => c.career_id === updateCareerForm.career_id)?.max_level || 10}
              value={updateCareerForm.current_level}
              onChange={(e) => setUpdateCareerForm((prev) => ({ ...prev, current_level: parseInt(e.target.value, 10) }))}
            />
          </label>
          {availableBranches.length > 0 && (
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Branch</span>
              <select
                className="ff-input text-sm"
                value={updateCareerForm.branch_id}
                onChange={(e) => setUpdateCareerForm((prev) => ({ ...prev, branch_id: e.target.value }))}
              >
                <option value="">No branch selected</option>
                {availableBranches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>{branch.branch_name}</option>
                ))}
              </select>
            </label>
          )}
          {loadingBranches && <p className="text-xs text-ff-muted">Loading branches...</p>}
          <label className="flex items-center gap-3 text-xs text-ff-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ff-border accent-ff-mint"
              checked={updateCareerForm.is_current}
              onChange={(e) => setUpdateCareerForm((prev) => ({ ...prev, is_current: e.target.checked }))}
            />
            <span>Active career</span>
          </label>
          <label className="flex items-center gap-3 text-xs text-ff-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ff-border accent-ff-mint"
              checked={updateCareerForm.is_completed}
              onChange={(e) => setUpdateCareerForm((prev) => ({ ...prev, is_completed: e.target.checked }))}
            />
            <span>Completed</span>
          </label>
          {updateCareerForm.is_completed && (
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Completion Date</span>
              <input
                type="date"
                className="ff-input text-sm"
                value={updateCareerForm.completion_date}
                onChange={(e) => setUpdateCareerForm((prev) => ({ ...prev, completion_date: e.target.value }))}
              />
            </label>
          )}
          <button className="ff-btn" onClick={handleUpdateCareer}>Save changes</button>
        </div>
      </Modal>
    </div>
  )
}
