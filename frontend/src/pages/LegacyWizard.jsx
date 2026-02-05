import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api'
import { useActiveLegacy } from '../context/useActiveLegacy'

const SUCCESSION_LAWS = {
  gender: [
    { value: 'equality', label: 'Equality', description: 'The heir is chosen regardless of gender.' },
    { value: 'strict_equality', label: 'Strict Equality', description: 'The heir is chosen regardless of gender, but must alternate each generation.' },
    { value: 'matriarchy', label: 'Matriarchy', description: 'The eldest eligible female is the heir.' },
    { value: 'strict_matriarchy', label: 'Strict Matriarchy', description: 'Only females can be heir. Males cannot inherit.' },
    { value: 'patriarchy', label: 'Patriarchy', description: 'The eldest eligible male is the heir.' },
    { value: 'strict_patriarchy', label: 'Strict Patriarchy', description: 'Only males can be heir. Females cannot inherit.' },
  ],
  bloodline: [
    { value: 'traditional', label: 'Traditional', description: 'Children of the previous heir are eligible.' },
    { value: 'strict_traditional', label: 'Strict Traditional', description: 'Only naturally born children of the heir are eligible.' },
    { value: 'modern', label: 'Modern', description: 'Adopted and biological children are equally eligible.' },
    { value: 'foster', label: 'Foster', description: 'Preference given to adopted children over biological.' },
    { value: 'strict_foster', label: 'Strict Foster', description: 'Only adopted children are eligible to be heir.' },
  ],
  heir: [
    { value: 'first_born', label: 'First Born', description: 'The eldest eligible child is the heir.' },
    { value: 'last_born', label: 'Last Born', description: 'The youngest eligible child is the heir.' },
    { value: 'living_will', label: 'Living Will', description: 'The previous heir chooses their successor.' },
    { value: 'merit', label: 'Merit', description: 'The child with the most completed aspirations is heir.' },
    { value: 'strength', label: 'Strength', description: 'The child with the highest combined skill levels is heir.' },
    { value: 'random', label: 'Random', description: 'The heir is chosen at random from eligible children.' },
    { value: 'exemplar', label: 'Exemplar', description: 'The child who best embodies the founder\'s traits is heir.' },
    { value: 'democracy', label: 'Democracy', description: 'The player community votes on the heir.' },
    { value: 'magical_bloodline', label: 'Magical Bloodline', description: 'Preference for children with strongest occult abilities.' },
    { value: 'magical_strength', label: 'Magical Strength', description: 'The child with the highest magic skill is heir.' },
  ],
  species: [
    { value: 'tolerant', label: 'Tolerant', description: 'Any species is eligible to be heir.' },
    { value: 'xenoarchy', label: 'Xenoarchy', description: 'Non-human heirs are preferred over humans.' },
    { value: 'xenophobic', label: 'Xenophobic', description: 'Human heirs are preferred over occults.' },
    { value: 'brood', label: 'Brood', description: 'Heirs must be the same occult type as the founder.' },
  ],
}

const STEPS = [
  { id: 'name', title: 'Name Your Legacy', icon: '✨' },
  { id: 'laws', title: 'Succession Laws', icon: '👑' },
  { id: 'generation', title: 'Starting Point', icon: '🎯' },
  { id: 'review', title: 'Review & Create', icon: '🚀' },
]

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentStep
        const isComplete = index < currentStep
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all ${
                isActive
                  ? 'bg-ff-mint text-ff-surface scale-110 shadow-glowMint'
                  : isComplete
                    ? 'bg-ff-mint/30 text-ff-mint'
                    : 'bg-ff-surface2 text-ff-muted'
              }`}
            >
              {isComplete ? '✓' : step.icon}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 rounded transition-colors ${
                  isComplete ? 'bg-ff-mint/50' : 'bg-ff-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LawSelector({ title, options, value, onChange }) {
  return (
    <div className="grid gap-3">
      <h4 className="text-sm font-medium text-ff-subtle uppercase tracking-wider">{title}</h4>
      <div className="grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`group cursor-pointer rounded-xl border p-3 transition-all ${
              value === option.value
                ? 'border-ff-mint bg-ff-mint/10 shadow-glowMint'
                : 'border-ff-border bg-ff-surface2/30 hover:border-ff-pink/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name={title}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="mt-1 accent-ff-mint"
              />
              <div>
                <span className="font-medium text-ff-text">{option.label}</span>
                <p className="mt-0.5 text-xs text-ff-muted">{option.description}</p>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function LegacyWizard() {
  const navigate = useNavigate()
  const { setActiveLegacyId } = useActiveLegacy()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [templates, setTemplates] = useState([])

  const [formData, setFormData] = useState({
    legacy_name: '',
    gender_law: 'equality',
    bloodline_law: 'traditional',
    heir_law: 'first_born',
    species_law: 'tolerant',
    starting_generation: 1,
  })

  // Fetch generation templates for preview
  useEffect(() => {
    apiClient.get('/generation-templates')
      .then((res) => setTemplates(res.data || []))
      .catch(() => {}) // Ignore errors, templates are optional preview
  }, [])

  const selectedTemplate = templates.find((t) => t.generation_number === formData.starting_generation)

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const canProceed = () => {
    if (currentStep === 0) return formData.legacy_name.trim().length > 0
    return true
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await apiClient.post('/legacies', formData)
      const legacyId = response.data?.legacy_id
      if (legacyId) {
        setActiveLegacyId(legacyId)
      }
      navigate('/sims/new', { state: { prefillHeir: true } })
    } catch (err) {
      setError(err.data?.error || 'Failed to create legacy. Please try again.')
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-ff-text">What will you call your legacy?</h2>
              <p className="mt-2 text-ff-muted">
                This is the family name that will echo through generations.
              </p>
            </div>
            <div className="mx-auto w-full max-w-md">
              <input
                type="text"
                className="ff-input text-center text-lg"
                placeholder="The Sterling Legacy"
                value={formData.legacy_name}
                onChange={(e) => updateFormData('legacy_name', e.target.value)}
                maxLength={200}
                autoFocus
              />
              <p className="mt-2 text-center text-xs text-ff-muted">
                {formData.legacy_name.length}/200 characters
              </p>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="grid gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-ff-text">Choose Your Succession Laws</h2>
              <p className="mt-2 text-ff-muted">
                These rules determine how heirs are chosen across generations.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <LawSelector
                title="Gender Law"
                options={SUCCESSION_LAWS.gender}
                value={formData.gender_law}
                onChange={(v) => updateFormData('gender_law', v)}
              />
              <LawSelector
                title="Bloodline Law"
                options={SUCCESSION_LAWS.bloodline}
                value={formData.bloodline_law}
                onChange={(v) => updateFormData('bloodline_law', v)}
              />
              <LawSelector
                title="Heir Law"
                options={SUCCESSION_LAWS.heir}
                value={formData.heir_law}
                onChange={(v) => updateFormData('heir_law', v)}
              />
              <LawSelector
                title="Species Law"
                options={SUCCESSION_LAWS.species}
                value={formData.species_law}
                onChange={(v) => updateFormData('species_law', v)}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="grid gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-ff-text">Pick Your Starting Generation</h2>
              <p className="mt-2 text-ff-muted">
                Start from the beginning or jump ahead to any of the 35 Pack Legacy generations.
              </p>
            </div>
            <div className="mx-auto w-full max-w-lg">
              <div className="ff-card p-5">
                <label className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ff-subtle uppercase tracking-wider">
                      Starting Generation
                    </span>
                    <span className="text-2xl font-bold text-ff-mint">
                      {formData.starting_generation}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={35}
                    value={formData.starting_generation}
                    onChange={(e) => updateFormData('starting_generation', parseInt(e.target.value, 10))}
                    className="w-full accent-ff-mint"
                  />
                  <div className="flex justify-between text-xs text-ff-muted">
                    <span>Gen 1</span>
                    <span>Gen 35</span>
                  </div>
                </label>
              </div>

              {selectedTemplate && (
                <div className="mt-4 ff-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ff-pink/20 text-ff-pink">
                      {formData.starting_generation}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-ff-text">{selectedTemplate.pack_name}</h4>
                      <p className="mt-1 text-sm text-ff-muted">
                        {selectedTemplate.required_goals_count} required goals, {selectedTemplate.optional_goals_count} optional
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="grid gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-ff-text">Ready to Begin?</h2>
              <p className="mt-2 text-ff-muted">
                Review your choices and create your legacy.
              </p>
            </div>
            <div className="mx-auto grid w-full max-w-lg gap-4">
              <div className="ff-card p-5">
                <h4 className="text-xs font-medium text-ff-subtle uppercase tracking-wider">Legacy Name</h4>
                <p className="mt-1 text-xl font-semibold text-ff-text">{formData.legacy_name}</p>
              </div>

              <div className="ff-card p-5">
                <h4 className="text-xs font-medium text-ff-subtle uppercase tracking-wider mb-3">Succession Laws</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-ff-muted">Gender:</span>{' '}
                    <span className="text-ff-text font-medium">
                      {SUCCESSION_LAWS.gender.find((l) => l.value === formData.gender_law)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-ff-muted">Bloodline:</span>{' '}
                    <span className="text-ff-text font-medium">
                      {SUCCESSION_LAWS.bloodline.find((l) => l.value === formData.bloodline_law)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-ff-muted">Heir:</span>{' '}
                    <span className="text-ff-text font-medium">
                      {SUCCESSION_LAWS.heir.find((l) => l.value === formData.heir_law)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-ff-muted">Species:</span>{' '}
                    <span className="text-ff-text font-medium">
                      {SUCCESSION_LAWS.species.find((l) => l.value === formData.species_law)?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ff-card p-5">
                <h4 className="text-xs font-medium text-ff-subtle uppercase tracking-wider">Starting Point</h4>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ff-mint/20 text-ff-mint font-bold">
                    {formData.starting_generation}
                  </div>
                  <div>
                    <p className="font-semibold text-ff-text">Generation {formData.starting_generation}</p>
                    {selectedTemplate && (
                      <p className="text-sm text-ff-muted">{selectedTemplate.pack_name}</p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-ff-coral/50 bg-ff-coral/10 p-4 text-sm text-ff-coral">
                  {error}
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="grid gap-8">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">New Legacy</p>
        <h1 className="text-3xl font-bold text-ff-text">Legacy Creation Wizard</h1>
      </header>

      <StepIndicator currentStep={currentStep} steps={STEPS} />

      <div className="ff-card mx-auto w-full max-w-4xl p-6 lg:p-8">
        {renderStepContent()}
      </div>

      <div className="flex items-center justify-center gap-4">
        {currentStep > 0 && (
          <button
            type="button"
            className="ff-btn-secondary"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Back
          </button>
        )}

        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            className="ff-btn"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="ff-btn"
            onClick={handleSubmit}
            disabled={isSubmitting || !canProceed()}
          >
            {isSubmitting ? 'Creating...' : 'Create Legacy'}
          </button>
        )}
      </div>
    </div>
  )
}
