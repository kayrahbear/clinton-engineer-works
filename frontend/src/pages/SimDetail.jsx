import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'

const tabs = ['Overview', 'Traits', 'Skills', 'Career', 'Relationships', 'Life Story']

const MILESTONE_CATEGORIES = [
  { id: 'fine_motor', label: 'Fine Motor', color: 'text-ff-mint' },
  { id: 'gross_motor', label: 'Gross Motor', color: 'text-ff-lilac2' },
  { id: 'cognitive', label: 'Cognitive', color: 'text-ff-yellow' },
  { id: 'motor', label: 'Motor', color: 'text-ff-pink' },
  { id: 'firsts', label: 'Firsts', color: 'text-ff-mint' },
  { id: 'life', label: 'Life', color: 'text-ff-lilac2' },
  { id: 'social', label: 'Social', color: 'text-ff-yellow' },
]

const AGE_ORDER = ['infant', 'toddler', 'child', 'teen', 'young_adult', 'adult', 'elder']
const AGE_INDEX = new Map(AGE_ORDER.map((age, index) => [age, index]))

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

const isMilestoneAgeAppropriate = (milestone, lifeStage) => {
  if (!lifeStage) return true
  const minAge = milestone.min_age_group
  const maxAge = milestone.max_age_group
  if (!minAge) return true
  const lifeIndex = AGE_INDEX.get(lifeStage)
  const minIndex = AGE_INDEX.get(minAge)
  if (lifeIndex === undefined || minIndex === undefined) return true
  if (lifeIndex < minIndex) return false
  if (!maxAge) return true
  const maxIndex = AGE_INDEX.get(maxAge)
  if (maxIndex === undefined) return true
  return lifeIndex <= maxIndex
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
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('')
  const [milestoneSearch, setMilestoneSearch] = useState('')
  const [milestoneCategoryFilter, setMilestoneCategoryFilter] = useState('all')
  const [milestoneShowAllAges, setMilestoneShowAllAges] = useState(false)
  const [milestoneAchievedDate, setMilestoneAchievedDate] = useState('')
  const [milestoneNotes, setMilestoneNotes] = useState('')
  const [milestoneRelatedSimId, setMilestoneRelatedSimId] = useState('')
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
    milestones: [],
    referenceTraits: [],
    referenceSkills: [],
    referenceAspirations: [],
    referenceCareers: [],
    referenceMilestones: [],
    legacySims: [],
  })

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))

        const simResponse = await apiClient.get(`/sims/${id}`)
        const sim = simResponse.data

        const legacySimsPromise = sim?.legacy_id
          ? apiClient.get(`/legacies/${sim.legacy_id}/sims`).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] })

        const [
          generationResponse,
          traitsResponse,
          skillsResponse,
          aspirationsResponse,
          careersResponse,
          relationshipsResponse,
          milestonesResponse,
          referenceTraitsResponse,
          referenceSkillsResponse,
          referenceAspirationsResponse,
          referenceCareersResponse,
          referenceMilestonesResponse,
          legacySimsResponse,
        ] = await Promise.all([
          sim?.generation_id ? apiClient.get(`/generations/${sim.generation_id}`).catch(() => null) : null,
          apiClient.get(`/sims/${id}/traits`),
          apiClient.get(`/sims/${id}/skills`),
          apiClient.get(`/sims/${id}/aspirations`),
          apiClient.get(`/sims/${id}/careers`),
          apiClient.get(`/sims/${id}/relationships`),
          apiClient.get(`/sims/${id}/milestones`),
          apiClient.get('/reference/traits').catch(() => ({ data: [] })),
          apiClient.get('/reference/skills').catch(() => ({ data: [] })),
          apiClient.get('/reference/aspirations').catch(() => ({ data: [] })),
          apiClient.get('/reference/careers').catch(() => ({ data: [] })),
          apiClient.get('/reference/milestones').catch(() => ({ data: [] })),
          legacySimsPromise,
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
          milestones: milestonesResponse.data || [],
          referenceTraits: referenceTraitsResponse.data || [],
          referenceSkills: referenceSkillsResponse.data || [],
          referenceAspirations: referenceAspirationsResponse.data || [],
          referenceCareers: referenceCareersResponse.data || [],
          referenceMilestones: referenceMilestonesResponse.data || [],
          legacySims: legacySimsResponse.data || [],
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

  const refreshMilestones = async () => {
    const refreshed = await apiClient.get(`/sims/${id}/milestones`)
    setState((prev) => ({ ...prev, milestones: refreshed.data || [] }))
  }

  const resetMilestoneModal = () => {
    setActiveModal(null)
    setSelectedMilestoneId('')
    setMilestoneSearch('')
    setMilestoneCategoryFilter('all')
    setMilestoneShowAllAges(false)
    setMilestoneAchievedDate('')
    setMilestoneNotes('')
    setMilestoneRelatedSimId('')
  }

  const handleAddMilestone = async () => {
    if (!selectedMilestoneId) return
    try {
      const payload = {
        milestone_id: selectedMilestoneId,
      }
      if (milestoneAchievedDate) payload.achieved_date = milestoneAchievedDate
      if (milestoneRelatedSimId) payload.related_sim_id = milestoneRelatedSimId
      if (milestoneNotes) payload.notes = milestoneNotes
      await apiClient.post(`/sims/${id}/milestones`, payload)
      await refreshMilestones()
      resetMilestoneModal()
    } catch (error) {
      window.alert(error?.data?.error || error?.message || 'Failed to add milestone')
    }
  }

  const handleRemoveMilestone = async (milestoneId) => {
    if (!milestoneId) return
    const confirmed = window.confirm('Remove this milestone? This cannot be undone.')
    if (!confirmed) return
    try {
      await apiClient.delete(`/sims/${id}/milestones/${milestoneId}`)
      await refreshMilestones()
    } catch (error) {
      window.alert(error?.data?.error || error?.message || 'Failed to remove milestone')
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
  const achievedMilestoneIds = useMemo(
    () => new Set(state.milestones.map((milestone) => milestone.milestone_id)),
    [state.milestones]
  )
  const milestoneCategories = useMemo(
    () => MILESTONE_CATEGORIES.map((category) => ({
      ...category,
      count: state.milestones.filter((milestone) => milestone.category === category.id).length,
    })),
    [state.milestones]
  )
  const milestoneTimeline = useMemo(() => {
    return [...state.milestones].sort((a, b) => {
      const aTime = a.achieved_date ? new Date(a.achieved_date).getTime() : 0
      const bTime = b.achieved_date ? new Date(b.achieved_date).getTime() : 0
      return bTime - aTime
    })
  }, [state.milestones])
  const filteredTimeline = useMemo(() => {
    if (milestoneCategoryFilter === 'all') return milestoneTimeline
    return milestoneTimeline.filter((milestone) => milestone.category === milestoneCategoryFilter)
  }, [milestoneCategoryFilter, milestoneTimeline])
  const availableMilestones = useMemo(() => {
    let list = state.referenceMilestones.filter(
      (milestone) => !achievedMilestoneIds.has(milestone.milestone_id)
    )
    if (!milestoneShowAllAges) {
      list = list.filter((milestone) => isMilestoneAgeAppropriate(milestone, state.sim?.life_stage))
    }
    if (milestoneCategoryFilter !== 'all') {
      list = list.filter((milestone) => milestone.category === milestoneCategoryFilter)
    }
    if (milestoneSearch.trim()) {
      const term = milestoneSearch.trim().toLowerCase()
      list = list.filter((milestone) =>
        `${milestone.milestone_name} ${milestone.description}`.toLowerCase().includes(term)
      )
    }
    return list.sort((a, b) => a.milestone_name.localeCompare(b.milestone_name))
  }, [
    state.referenceMilestones,
    achievedMilestoneIds,
    milestoneShowAllAges,
    milestoneCategoryFilter,
    milestoneSearch,
    state.sim?.life_stage,
  ])

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
          <button className="ff-btn-secondary" onClick={() => setActiveModal('milestone')}>
            + Add Milestone
          </button>
          {/* <button className="ff-btn">✨ Ask AI about this Sim</button> */}
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
                    <p className="mt-2 text-sm font-semibold text-ff-text">{state.skills.length} skills</p>
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

          {activeTab === 'Life Story' && (
            <div className="ff-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ff-text">{sim.name}'s Life Story</h3>
                  <p className="mt-1 text-sm text-ff-muted">Chronicle your sim's adventures, memories, and narrative moments.</p>
                </div>
                {/* <button className="ff-btn">✨ Generate a scene</button> */}
              </div>
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-yellow/5 via-ff-surface2/60 to-ff-mint/5 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <button className="ff-btn-secondary" onClick={() => setActiveModal('milestone')}>
                          + Add Milestone
                        </button>
                        {/* <p className="mt-2 text-m font-semibold text-ff-text">Current life stage</p>
                        <p className="mt-2 text-sm text-ff-text">{toLabel(state.sim?.life_stage)}</p>
                        <p className="mt-2 text-xs text-ff-muted">Filtered milestones are tuned to this stage by default.</p> */}
                      </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-ff-border/70 bg-ff-surface2/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold text-ff-text">Milestone Memories</h4>
                      <p className="mt-1 text-sm text-ff-muted">Log major life events, firsts, and growth moments.</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Achieved by category</p>
                          <div className="flex items-center gap-2 text-xs text-ff-muted">
                            <span>Total: </span>
                            <span className="text-ff-text">{state.milestones.length}</span>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {milestoneCategories.map((category) => (
                            <div
                              key={category.id}
                              className="rounded-2xl border border-ff-border/70 bg-ff-surface2/60 p-4"
                            >
                              <div className="flex items-center justify-between">
                                <p className={`text-sm font-semibold ${category.color}`}>{category.label}</p>
                                <span className="ff-chip text-xs">{category.count}</span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {state.milestones
                                  .filter((milestone) => milestone.category === category.id)
                                  .slice(0, 6)
                                  .map((milestone) => (
                                    <span key={milestone.milestone_id} className="ff-chip text-xs">
                                      {milestone.milestone_name}
                                    </span>
                                  ))}
                                {state.milestones.filter((milestone) => milestone.category === category.id).length === 0 && (
                                  <span className="text-xs text-ff-muted">No milestones yet</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Timeline</p>
                          <label className="text-xs text-ff-muted">
                            <span className="uppercase tracking-[0.2em] text-ff-subtle">Filter</span>
                            <select
                              className="ml-2 rounded-full border border-ff-border/70 bg-ff-surface2/70 px-3 py-1 text-xs text-ff-text"
                              value={milestoneCategoryFilter}
                              onChange={(e) => setMilestoneCategoryFilter(e.target.value)}
                            >
                              <option value="all">All categories</option>
                              {MILESTONE_CATEGORIES.map((category) => (
                                <option key={category.id} value={category.id}>{category.label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="mt-4 space-y-3">
                          {filteredTimeline.length === 0 && (
                            <div className="rounded-2xl border border-ff-border/70 bg-ff-surface2/60 p-4 text-sm text-ff-muted">
                              No milestones logged yet. Add your first memory to start the timeline.
                            </div>
                          )}
                          {filteredTimeline.map((milestone) => (
                            <div
                              key={`${milestone.milestone_id}-${milestone.achieved_date}`}
                              className="rounded-2xl border border-ff-border/70 bg-gradient-to-br from-ff-surface2/60 via-ff-surface/60 to-ff-mint/5 p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-ff-text">{milestone.milestone_name}</p>
                                    <span className="ff-chip text-xs">{toLabel(milestone.category)}</span>
                                  </div>
                                  <p className="mt-2 text-xs text-ff-muted">{milestone.description}</p>
                                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ff-muted">
                                    <span>{formatDate(milestone.achieved_date)}</span>
                                    {milestone.related_sim_id && (
                                      <span>
                                        Linked to{' '}
                                        {state.legacySims.find((simItem) => simItem.sim_id === milestone.related_sim_id)?.name || 'related sim'}
                                      </span>
                                    )}
                                  </div>
                                  {milestone.notes && (
                                    <p className="mt-3 text-xs text-ff-text">{milestone.notes}</p>
                                  )}
                                </div>
                                <button
                                  className="ff-btn-secondary text-xs"
                                  onClick={() => handleRemoveMilestone(milestone.milestone_id)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
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
            {/* <button className="mt-4 ff-btn">✨ Generate a scene</button> */}
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
        title="Add a milestone"
        description="Pick a milestone, add optional notes, and log the date it was achieved."
        isOpen={activeModal === 'milestone'}
        onClose={resetMilestoneModal}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Search</span>
              <input
                className="ff-input text-sm"
                placeholder="Search milestones"
                value={milestoneSearch}
                onChange={(e) => setMilestoneSearch(e.target.value)}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Category</span>
                <select
                  className="ff-input text-sm"
                  value={milestoneCategoryFilter}
                  onChange={(e) => setMilestoneCategoryFilter(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {MILESTONE_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3 text-xs text-ff-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ff-border accent-ff-mint"
                  checked={milestoneShowAllAges}
                  onChange={(e) => setMilestoneShowAllAges(e.target.checked)}
                />
                <span>Show all milestones (override age)</span>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-ff-border/70 bg-ff-surface2/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Select milestone</p>
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-2">
              {availableMilestones.map((milestone) => {
                const isSelected = selectedMilestoneId === milestone.milestone_id
                const ageLabel = milestone.max_age_group
                  ? `${toLabel(milestone.min_age_group)} - ${toLabel(milestone.max_age_group)}`
                  : `From ${toLabel(milestone.min_age_group)}`
                return (
                  <button
                    key={milestone.milestone_id}
                    type="button"
                    onClick={() => setSelectedMilestoneId(milestone.milestone_id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? 'border-ff-mint/60 bg-ff-surface'
                        : 'border-ff-border/70 bg-transparent hover:border-ff-mint/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ff-text">{milestone.milestone_name}</p>
                        <p className="mt-1 text-xs text-ff-muted">{milestone.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ff-muted">
                          <span className="ff-chip text-[10px]">{toLabel(milestone.category)}</span>
                          <span>{ageLabel}</span>
                        </div>
                      </div>
                      {isSelected && <span className="text-ff-mint">✓</span>}
                    </div>
                  </button>
                )
              })}
              {availableMilestones.length === 0 && (
                <p className="text-xs text-ff-muted">No milestones match the current filters.</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Achieved date</span>
              <input
                type="date"
                className="ff-input text-sm"
                value={milestoneAchievedDate}
                onChange={(e) => setMilestoneAchievedDate(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-xs text-ff-muted">
              <span className="uppercase tracking-[0.2em] text-ff-subtle">Related sim (optional)</span>
              <select
                className="ff-input text-sm"
                value={milestoneRelatedSimId}
                onChange={(e) => setMilestoneRelatedSimId(e.target.value)}
              >
                <option value="">None</option>
                {state.legacySims
                  .filter((simItem) => simItem.sim_id !== id)
                  .map((simItem) => (
                    <option key={simItem.sim_id} value={simItem.sim_id}>{simItem.name}</option>
                  ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-xs text-ff-muted">
            <span className="uppercase tracking-[0.2em] text-ff-subtle">Notes</span>
            <textarea
              className="ff-input text-sm"
              rows="3"
              placeholder="Add story notes or context"
              value={milestoneNotes}
              onChange={(e) => setMilestoneNotes(e.target.value)}
            />
          </label>
          <button className="ff-btn" disabled={!selectedMilestoneId} onClick={handleAddMilestone}>
            Add milestone
          </button>
        </div>
      </Modal>

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
