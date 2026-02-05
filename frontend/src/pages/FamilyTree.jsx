import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { apiClient } from '../api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorState from '../components/ErrorState'

export default function FamilyTree() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [treeData, setTreeData] = useState(null)

  useEffect(() => {
    async function fetchFamilyTree() {
      try {
        setLoading(true)
        const response = await apiClient.get(`/sims/${id}/family-tree`)
        setTreeData(response.data)
      } catch (err) {
        setError(err.message || 'Failed to load family tree')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchFamilyTree()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load family tree"
        message={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (!treeData) {
    return (
      <ErrorState
        title="No family tree data"
        message="Unable to find family information for this sim"
      />
    )
  }

  const { sim, ancestors, descendants } = treeData

  // Helper function to render a sim node
  const renderSimNode = (simData, relationship = null) => (
    <div
      key={simData.sim_id}
      className="group flex flex-col items-center gap-3"
    >
      <button
        onClick={() => navigate(`/sims/${simData.sim_id}`)}
        className="flex flex-col items-center gap-2 transition hover:scale-105"
      >
        <div className="relative">
          <div
            className={`h-20 w-20 rounded-full border ${
              simData.sim_id === sim.sim_id
                ? 'border-ff-mint bg-gradient-to-br from-ff-pink/40 via-ff-mint/40 to-ff-lilac/60 shadow-glowMint'
                : 'border-ff-border/70 bg-gradient-to-br from-ff-surface2/60 to-ff-surface2/40'
            } transition group-hover:shadow-glowMint`}
          >
            {simData.portrait && (
              <img
                src={simData.portrait}
                alt={simData.name}
                className="h-full w-full rounded-full object-cover"
              />
            )}
          </div>
          {relationship && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ff-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ff-subtle">
              {relationship}
            </span>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-ff-text group-hover:text-ff-mint">
            {simData.name}
          </p>
          <p className="text-xs text-ff-muted">Gen {simData.generation_number || '?'}</p>
        </div>
      </button>
    </div>
  )

  // Get parents
  const mother = ancestors.find((a) => a.sim_id === sim.mother_id)
  const father = ancestors.find((a) => a.sim_id === sim.father_id)

  // Get grandparents
  const maternalGrandmother = mother
    ? ancestors.find((a) => a.sim_id === mother.mother_id)
    : null
  const maternalGrandfather = mother
    ? ancestors.find((a) => a.sim_id === mother.father_id)
    : null
  const paternalGrandmother = father
    ? ancestors.find((a) => a.sim_id === father.mother_id)
    : null
  const paternalGrandfather = father
    ? ancestors.find((a) => a.sim_id === father.father_id)
    : null

  // Group descendants by generation depth
  const childrenByDepth = descendants.reduce((acc, desc) => {
    if (!acc[desc.depth]) {
      acc[desc.depth] = []
    }
    acc[desc.depth].push(desc)
    return acc
  }, {})

  const directChildren = childrenByDepth[1] || []
  const grandchildren = childrenByDepth[2] || []

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ff-subtle">Family Tree</p>
          <h2 className="text-3xl font-semibold text-ff-text">{sim.name}</h2>
          <p className="mt-2 text-sm text-ff-muted">
            Explore ancestors and descendants across generations
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/sims/${sim.sim_id}`} className="ff-btn-secondary">
            ← Back to profile
          </Link>
          <Link to="/sims" className="ff-btn-secondary">
            View all sims
          </Link>
        </div>
      </header>

      {/* Tree Visualization */}
      <div className="ff-card p-8">
        <div className="flex flex-col items-center gap-12">
          {/* Grandparents Level */}
          {(maternalGrandmother || maternalGrandfather || paternalGrandmother || paternalGrandfather) && (
            <div className="w-full">
              <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-ff-subtle">
                Grandparents
              </p>
              <div className="grid grid-cols-2 gap-16 lg:grid-cols-4">
                <div className="flex justify-center">
                  {maternalGrandmother
                    ? renderSimNode(maternalGrandmother, 'Grandmother')
                    : <div className="h-20 w-20 rounded-full border-2 border-dashed border-ff-border/30" />
                  }
                </div>
                <div className="flex justify-center">
                  {maternalGrandfather
                    ? renderSimNode(maternalGrandfather, 'Grandfather')
                    : <div className="h-20 w-20 rounded-full border-2 border-dashed border-ff-border/30" />
                  }
                </div>
                <div className="flex justify-center">
                  {paternalGrandmother
                    ? renderSimNode(paternalGrandmother, 'Grandmother')
                    : <div className="h-20 w-20 rounded-full border-2 border-dashed border-ff-border/30" />
                  }
                </div>
                <div className="flex justify-center">
                  {paternalGrandfather
                    ? renderSimNode(paternalGrandfather, 'Grandfather')
                    : <div className="h-20 w-20 rounded-full border-2 border-dashed border-ff-border/30" />
                  }
                </div>
              </div>
              {/* Connecting line */}
              <div className="mx-auto mt-4 h-8 w-px bg-gradient-to-b from-ff-mint/40 to-transparent" />
            </div>
          )}

          {/* Parents Level */}
          {(mother || father) && (
            <div className="w-full">
              <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-ff-subtle">
                Parents
              </p>
              <div className="flex justify-center gap-16">
                <div className="flex justify-center">
                  {mother
                    ? renderSimNode(mother, 'Mother')
                    : <div className="h-20 w-20 rounded-full border-2 border-dashed border-ff-border/30" />
                  }
                </div>
                <div className="flex justify-center">
                  {father
                    ? renderSimNode(father, 'Father')
                    : <div className="h-20 w-20 rounded-full border-2 border-dashed border-ff-border/30" />
                  }
                </div>
              </div>
              {/* Connecting line */}
              <div className="mx-auto mt-4 h-8 w-px bg-gradient-to-b from-ff-mint/40 to-transparent" />
            </div>
          )}

          {/* Current Sim (Focus) */}
          <div className="w-full">
            <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-ff-subtle">
              Focus Sim
            </p>
            <div className="flex justify-center">
              {renderSimNode(sim)}
            </div>
            {directChildren.length > 0 && (
              <div className="mx-auto mt-4 h-8 w-px bg-gradient-to-b from-transparent to-ff-mint/40" />
            )}
          </div>

          {/* Children Level */}
          {directChildren.length > 0 && (
            <div className="w-full">
              <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-ff-subtle">
                Children
              </p>
              <div className="flex flex-wrap justify-center gap-8">
                {directChildren.map((child) => (
                  <div key={child.sim_id}>
                    {renderSimNode(child, 'Child')}
                  </div>
                ))}
              </div>
              {grandchildren.length > 0 && (
                <div className="mx-auto mt-4 h-8 w-px bg-gradient-to-b from-transparent to-ff-mint/40" />
              )}
            </div>
          )}

          {/* Grandchildren Level */}
          {grandchildren.length > 0 && (
            <div className="w-full">
              <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-ff-subtle">
                Grandchildren
              </p>
              <div className="flex flex-wrap justify-center gap-8">
                {grandchildren.map((grandchild) => (
                  <div key={grandchild.sim_id}>
                    {renderSimNode(grandchild, 'Grandchild')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="ff-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Ancestors</p>
          <p className="mt-2 text-2xl font-semibold text-ff-text">{ancestors.length}</p>
          <p className="mt-2 text-xs text-ff-muted">Generations above</p>
        </div>
        <div className="ff-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Current</p>
          <p className="mt-2 text-2xl font-semibold text-ff-text">{sim.name}</p>
          <p className="mt-2 text-xs text-ff-muted">Generation {sim.generation_number || '?'}</p>
        </div>
        <div className="ff-card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ff-subtle">Descendants</p>
          <p className="mt-2 text-2xl font-semibold text-ff-text">{descendants.length}</p>
          <p className="mt-2 text-xs text-ff-muted">Generations below</p>
        </div>
      </div>

      {/* All Ancestors List */}
      {ancestors.length > 0 && (
        <div className="ff-card p-6">
          <h3 className="text-base font-semibold text-ff-text">All Ancestors</h3>
          <p className="mt-1 text-sm text-ff-muted">
            Complete lineage tracing back through {ancestors.length} sim{ancestors.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ancestors.map((ancestor) => (
              <Link
                key={ancestor.sim_id}
                to={`/sims/${ancestor.sim_id}`}
                className="group flex items-center gap-3 rounded-xl border border-ff-border/70 bg-ff-surface2/50 p-3 transition hover:border-ff-mint/40 hover:shadow-glowMint"
              >
                <div className="h-12 w-12 rounded-full border border-ff-border/70 bg-gradient-to-br from-ff-surface2/60 to-ff-surface2/40 transition group-hover:shadow-glowMint">
                  {ancestor.portrait && (
                    <img
                      src={ancestor.portrait}
                      alt={ancestor.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ff-text truncate group-hover:text-ff-mint">
                    {ancestor.name}
                  </p>
                  <p className="text-xs text-ff-muted">
                    Gen {ancestor.generation_number || '?'} · {ancestor.life_stage || 'Unknown'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Descendants List */}
      {descendants.length > 0 && (
        <div className="ff-card p-6">
          <h3 className="text-base font-semibold text-ff-text">All Descendants</h3>
          <p className="mt-1 text-sm text-ff-muted">
            Legacy continues through {descendants.length} descendant{descendants.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {descendants.map((descendant) => (
              <Link
                key={descendant.sim_id}
                to={`/sims/${descendant.sim_id}`}
                className="group flex items-center gap-3 rounded-xl border border-ff-border/70 bg-ff-surface2/50 p-3 transition hover:border-ff-mint/40 hover:shadow-glowMint"
              >
                <div className="h-12 w-12 rounded-full border border-ff-border/70 bg-gradient-to-br from-ff-surface2/60 to-ff-surface2/40 transition group-hover:shadow-glowMint">
                  {descendant.portrait && (
                    <img
                      src={descendant.portrait}
                      alt={descendant.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ff-text truncate group-hover:text-ff-mint">
                    {descendant.name}
                  </p>
                  <p className="text-xs text-ff-muted">
                    Gen {descendant.generation_number || '?'} · {descendant.life_stage || 'Unknown'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
