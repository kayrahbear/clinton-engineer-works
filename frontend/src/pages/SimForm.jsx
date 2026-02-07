import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiClient, getLegacyGenerations } from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import { useActiveLegacy } from '../context/useActiveLegacy'

const LIFE_STAGE_OPTIONS = [
  { value: 'infant', label: 'Infant' },
  { value: 'toddler', label: 'Toddler' },
  { value: 'child', label: 'Child' },
  { value: 'teen', label: 'Teen' },
  { value: 'young_adult', label: 'Young Adult' },
  { value: 'adult', label: 'Adult' },
  { value: 'elder', label: 'Elder' },
]

const OCCULT_OPTIONS = [
  { value: 'human', label: 'Human' },
  { value: 'alien', label: 'Alien' },
  { value: 'vampire', label: 'Vampire' },
  { value: 'spellcaster', label: 'Spellcaster' },
  { value: 'werewolf', label: 'Werewolf' },
  { value: 'mermaid', label: 'Mermaid' },
  { value: 'servo', label: 'Servo' },
  { value: 'ghost', label: 'Ghost' },
]

const TRAIT_SLOT_LABELS = ['Primary trait', 'Secondary trait', 'Tertiary trait']

const getTraitLimitForLifeStage = (lifeStage) => {
  if (lifeStage === 'teen') return 2
  if (lifeStage === 'child' || lifeStage === 'toddler' || lifeStage === 'infant') return 1
  return 3
}

const getTraitPoolForLifeStage = (traits, lifeStage) => {
  if (lifeStage === 'infant') {
    return traits.filter((trait) => trait.infant_only)
  }

  if (lifeStage === 'toddler') {
    return traits.filter((trait) => trait.toddler_only)
  }

  return traits.filter((trait) => trait.trait_type === 'personality' && !trait.infant_only && !trait.toddler_only)
}

const getDefaultTraitSelections = (traits, lifeStage) => {
  const traitPool = getTraitPoolForLifeStage(traits, lifeStage)
  const limit = getTraitLimitForLifeStage(lifeStage)
  const next = Array(3).fill('')

  for (let i = 0; i < limit; i += 1) {
    next[i] = traitPool[i]?.trait_id || ''
  }

  return next
}

const normalizeTraitSelections = (selectedTraitIds, traits, lifeStage) => {
  const limit = getTraitLimitForLifeStage(lifeStage)
  const validTraitIds = new Set(getTraitPoolForLifeStage(traits, lifeStage).map((trait) => trait.trait_id))
  const next = Array(3).fill('')
  const seen = new Set()

  for (let i = 0; i < limit; i += 1) {
    const id = selectedTraitIds[i]
    if (id && validTraitIds.has(id) && !seen.has(id)) {
      next[i] = id
      seen.add(id)
    }
  }

  return next
}

const getAspirationsForLifeStage = (aspirations, lifeStage) => {
  if (lifeStage === 'infant' || lifeStage === 'toddler') {
    return []
  }

  if (lifeStage === 'child') {
    return aspirations.filter((aspiration) => aspiration.child_only)
  }

  return aspirations.filter((aspiration) => !aspiration.child_only)
}

const canHaveCareerForLifeStage = (lifeStage) =>
  lifeStage === 'young_adult' || lifeStage === 'adult' || lifeStage === 'elder'

export default function SimForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeLegacyId, loading: legacyLoading } = useActiveLegacy()

  const [bootState, setBootState] = useState({
    loading: true,
    error: null,
  })

  const [submitState, setSubmitState] = useState({
    saving: false,
    error: null,
  })

  const [referenceData, setReferenceData] = useState({
    worlds: [],
    traits: [],
    aspirations: [],
    careers: [],
    generations: [],
  })

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    pronouns: '',
    generationId: '',
    worldId: '',
    lifeStage: 'young_adult',
    occultType: 'human',
    currentHousehold: true,
    isHeir: Boolean(location.state?.prefillHeir),
    selectedTraitIds: ['', '', ''],
    aspirationId: '',
    careerId: '',
    notes: '',
  })

  useEffect(() => {
    let isMounted = true

    async function loadFormData() {
      try {
        setBootState({ loading: true, error: null })

        const legacyIdForFetch = activeLegacyId

        if (!legacyIdForFetch) {
          throw new Error('No active legacy selected. Pick one from the header or create a legacy first.')
        }

        const [worldsRes, traitsRes, aspirationsRes, careersRes, generationsRes] = await Promise.all([
          apiClient.get('/reference/worlds'),
          apiClient.get('/reference/traits'),
          apiClient.get('/reference/aspirations'),
          apiClient.get('/reference/careers'),
          getLegacyGenerations(legacyIdForFetch),
        ])

        if (!isMounted) return

        const generations = generationsRes.data || []
        const activeGeneration = generations.find((generation) => generation.is_active)
        const fallbackGeneration = activeGeneration || generations[0]

        setReferenceData({
          worlds: worldsRes.data || [],
          traits: traitsRes.data || [],
          aspirations: aspirationsRes.data || [],
          careers: careersRes.data || [],
          generations,
        })

        setFormData((prev) => {
          const aspirationsForStage = getAspirationsForLifeStage(aspirationsRes.data || [], prev.lifeStage)

          return {
            ...prev,
            generationId: fallbackGeneration?.generation_id || '',
            worldId: (worldsRes.data || [])[0]?.world_id || '',
            selectedTraitIds: getDefaultTraitSelections(traitsRes.data || [], prev.lifeStage),
            aspirationId: aspirationsForStage[0]?.aspiration_id || '',
            careerId: (careersRes.data || [])[0]?.career_id || '',
          }
        })

        setBootState({ loading: false, error: null })
      } catch (error) {
        if (!isMounted) return
        setBootState({
          loading: false,
          error: error?.data?.error || error?.message || 'Failed to load sim form data.',
        })
      }
    }

    if (legacyLoading) {
      return () => {
        isMounted = false
      }
    }

    loadFormData()

    return () => {
      isMounted = false
    }
  }, [activeLegacyId, legacyLoading])

  const selectedGeneration = useMemo(
    () => referenceData.generations.find((generation) => generation.generation_id === formData.generationId),
    [referenceData.generations, formData.generationId]
  )

  const traitLimit = useMemo(() => getTraitLimitForLifeStage(formData.lifeStage), [formData.lifeStage])

  const traitPool = useMemo(
    () => getTraitPoolForLifeStage(referenceData.traits, formData.lifeStage),
    [referenceData.traits, formData.lifeStage]
  )

  const selectedTraits = useMemo(
    () => formData.selectedTraitIds.slice(0, traitLimit).filter(Boolean),
    [formData.selectedTraitIds, traitLimit]
  )

  const aspirationOptions = useMemo(
    () => getAspirationsForLifeStage(referenceData.aspirations, formData.lifeStage),
    [referenceData.aspirations, formData.lifeStage]
  )

  const careerAllowed = useMemo(() => canHaveCareerForLifeStage(formData.lifeStage), [formData.lifeStage])

  const handleChange = (field, value) => {
    setFormData((prev) => {
      if (field === 'lifeStage') {
        const nextAspirations = getAspirationsForLifeStage(referenceData.aspirations, value)
        const nextAspirationId = nextAspirations.some((aspiration) => aspiration.aspiration_id === prev.aspirationId)
          ? prev.aspirationId
          : nextAspirations[0]?.aspiration_id || ''
        const nextCareerAllowed = canHaveCareerForLifeStage(value)

        return {
          ...prev,
          lifeStage: value,
          selectedTraitIds: normalizeTraitSelections(prev.selectedTraitIds, referenceData.traits, value),
          aspirationId: nextAspirationId,
          careerId: nextCareerAllowed ? prev.careerId || referenceData.careers[0]?.career_id || '' : '',
        }
      }

      return { ...prev, [field]: value }
    })
  }

  const handleTraitChange = (index, value) => {
    setFormData((prev) => {
      const nextTraitIds = [...prev.selectedTraitIds]
      nextTraitIds[index] = value
      return {
        ...prev,
        selectedTraitIds: normalizeTraitSelections(nextTraitIds, referenceData.traits, prev.lifeStage),
      }
    })
  }

  const buildName = () => `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()

  const handleSubmit = async () => {
    setSubmitState({ saving: true, error: null })

    try {
      if (!formData.firstName.trim()) {
        throw new Error('First name is required.')
      }

      if (!formData.lastName.trim()) {
        throw new Error('Last name is required.')
      }

      if (!formData.gender.trim()) {
        throw new Error('Gender is required by the current backend schema.')
      }

      if (!formData.generationId) {
        throw new Error('Please choose a generation.')
      }

      if (!activeLegacyId) {
        throw new Error('Please choose a legacy.')
      }

      const createPayload = {
        legacy_id: activeLegacyId,
        generation_id: formData.generationId,
        name: buildName(),
        gender: formData.gender.trim(),
        pronouns: formData.pronouns.trim() || null,
        life_stage: formData.lifeStage,
        occult_type: formData.occultType,
        world_of_residence_id: formData.worldId || null,
        current_household: formData.currentHousehold,
        is_generation_heir: formData.isHeir,
        notes: formData.notes.trim() || null,
      }

      const createResponse = await apiClient.post('/sims', createPayload)
      const simId = createResponse?.data?.sim_id

      if (!simId) {
        throw new Error('Sim was created but no sim id was returned.')
      }

      const optionalRequests = []

      selectedTraits.forEach((traitId, index) => {
        optionalRequests.push(
          apiClient.post(`/sims/${simId}/traits`, {
            trait_id: traitId,
            trait_slot: String(index + 1),
          })
        )
      })

      if (formData.aspirationId && aspirationOptions.length > 0) {
        optionalRequests.push(
          apiClient.post(`/sims/${simId}/aspirations`, {
            aspiration_id: formData.aspirationId,
            is_current: true,
          })
        )
      }

      if (formData.careerId && careerAllowed) {
        optionalRequests.push(
          apiClient.post(`/sims/${simId}/careers`, {
            career_id: formData.careerId,
            is_current: true,
          })
        )
      }

      if (optionalRequests.length > 0) {
        await Promise.allSettled(optionalRequests)
      }

      navigate(`/sims/${simId}`)
    } catch (error) {
      setSubmitState({
        saving: false,
        error: error?.data?.error || error?.message || 'Failed to create sim.',
      })
      return
    }

    setSubmitState({ saving: false, error: null })
  }

  if (bootState.loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner label="Loading form data" />
      </div>
    )
  }

  if (bootState.error) {
    return (
      <ErrorState
        title="Sim form unavailable"
        message={bootState.error}
        onRetry={() => window.location.reload()}
      />
    )
  }

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
          <button className="ff-btn" onClick={handleSubmit} disabled={submitState.saving}>
            {submitState.saving ? 'Saving...' : 'Save Sim'}
          </button>
        </div>
      </header>

      {submitState.error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-4 text-sm text-rose-100">
          {submitState.error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Core details</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">First name</span>
                <input
                  className="ff-input text-sm"
                  placeholder="Sofia"
                  value={formData.firstName}
                  onChange={(event) => handleChange('firstName', event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Last name</span>
                <input
                  className="ff-input text-sm"
                  placeholder="Sterling"
                  value={formData.lastName}
                  onChange={(event) => handleChange('lastName', event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Gender</span>
                <input
                  className="ff-input text-sm"
                  placeholder="Female"
                  value={formData.gender}
                  onChange={(event) => handleChange('gender', event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Pronouns</span>
                <input
                  className="ff-input text-sm"
                  placeholder="She/Her"
                  value={formData.pronouns}
                  onChange={(event) => handleChange('pronouns', event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Generation</span>
                <select
                  className="ff-input text-sm"
                  value={formData.generationId}
                  onChange={(event) => handleChange('generationId', event.target.value)}
                >
                  {referenceData.generations.map((generation) => (
                    <option key={generation.generation_id} value={generation.generation_id}>
                      Gen {generation.generation_number} - {generation.pack_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">World</span>
                <select
                  className="ff-input text-sm"
                  value={formData.worldId}
                  onChange={(event) => handleChange('worldId', event.target.value)}
                >
                  {referenceData.worlds.map((world) => (
                    <option key={world.world_id} value={world.world_id}>
                      {world.world_name}
                    </option>
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
                <select
                  className="ff-input text-sm"
                  value={formData.lifeStage}
                  onChange={(event) => handleChange('lifeStage', event.target.value)}
                >
                  {LIFE_STAGE_OPTIONS.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Occult type</span>
                <select
                  className="ff-input text-sm"
                  value={formData.occultType}
                  onChange={(event) => handleChange('occultType', event.target.value)}
                >
                  {OCCULT_OPTIONS.map((occult) => (
                    <option key={occult.value} value={occult.value}>
                      {occult.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-ff-muted">
                <input
                  type="checkbox"
                  checked={formData.currentHousehold}
                  onChange={(event) => handleChange('currentHousehold', event.target.checked)}
                  className="h-4 w-4 accent-ff-mint"
                />
                Household member
              </label>
              <label className="flex items-center gap-2 text-sm text-ff-muted">
                <input
                  type="checkbox"
                  checked={formData.isHeir}
                  onChange={(event) => handleChange('isHeir', event.target.checked)}
                  className="h-4 w-4 accent-ff-pink"
                />
                Heir
              </label>
            </div>
          </div>

          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Personality picks</h3>
            <p className="mt-2 text-xs text-ff-muted">
              {traitLimit === 1
                ? 'This life stage supports 1 trait.'
                : `This life stage supports up to ${traitLimit} traits.`}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: traitLimit }).map((_, index) => {
                const currentValue = formData.selectedTraitIds[index]
                const otherSelectedIds = new Set(
                  formData.selectedTraitIds.slice(0, traitLimit).filter((id, idIndex) => idIndex !== index && id)
                )
                const slotOptions = traitPool.filter(
                  (trait) => !otherSelectedIds.has(trait.trait_id) || trait.trait_id === currentValue
                )

                return (
                  <label key={TRAIT_SLOT_LABELS[index]} className="grid gap-2 text-xs text-ff-muted">
                    <span className="uppercase tracking-[0.2em] text-ff-subtle">{TRAIT_SLOT_LABELS[index]}</span>
                    <select
                      className="ff-input text-sm"
                      value={currentValue}
                      onChange={(event) => handleTraitChange(index, event.target.value)}
                    >
                      <option value="">Select a trait</option>
                      {slotOptions.map((trait) => (
                        <option key={trait.trait_id} value={trait.trait_id}>
                          {trait.trait_name}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Aspiration</span>
                <select
                  className="ff-input text-sm"
                  value={formData.aspirationId}
                  onChange={(event) => handleChange('aspirationId', event.target.value)}
                  disabled={aspirationOptions.length === 0}
                >
                  {aspirationOptions.length === 0 ? (
                    <option value="">No aspiration for this life stage</option>
                  ) : null}
                  {aspirationOptions.map((aspiration) => (
                    <option key={aspiration.aspiration_id} value={aspiration.aspiration_id}>
                      {aspiration.aspiration_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-ff-muted">
                <span className="uppercase tracking-[0.2em] text-ff-subtle">Career focus</span>
                <select
                  className="ff-input text-sm"
                  value={formData.careerId}
                  onChange={(event) => handleChange('careerId', event.target.value)}
                  disabled={!careerAllowed}
                >
                  {!careerAllowed ? <option value="">No career for this life stage</option> : null}
                  {referenceData.careers.map((career) => (
                    <option key={career.career_id} value={career.career_id}>
                      {career.career_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {traitPool.length === 0 ? (
              <p className="mt-3 text-xs text-ff-pink">
                No trait options are currently available for this life stage
              </p>
            ) : null}
            {formData.lifeStage === 'child' ? (
              <p className="mt-2 text-xs text-ff-muted">
                Children use age-specific grow-up aspirations.
              </p>
            ) : null}
          </div>
        </div>

        <aside className="grid gap-6">
          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Portrait upload</h3>
            <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ff-border/70 bg-ff-surface2/50 p-6 text-center text-sm text-ff-muted">
              <div className="h-20 w-20 rounded-full border border-ff-mint/40 bg-gradient-to-br from-ff-pink/40 via-ff-mint/40 to-ff-lilac/60" />
              <p>Portrait upload is not wired yet.</p>
              <button className="ff-btn-secondary" type="button" disabled>
                Choose file
              </button>
            </div>
          </div>

          <div className="ff-card p-5">
            <h3 className="text-base font-semibold text-ff-text">Notes</h3>
            <textarea
              className="ff-input mt-4 min-h-[140px] text-sm"
              placeholder="Add a quick backstory or reminder."
              value={formData.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
            />
          </div>

          <div className="ff-card p-5 text-sm text-ff-muted">
            <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Summary</p>
            <p className="mt-2 text-ff-text">{buildName() || 'New Sim'}</p>
            <p className="mt-1">{selectedGeneration ? `Gen ${selectedGeneration.generation_number}` : 'No generation selected'}</p>
            <p className="mt-1">Status will start as Alive</p>
          </div>
        </aside>
      </section>
    </div>
  )
}
