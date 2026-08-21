import { useState } from 'react'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useFavoritePositions, type Position } from '../hooks/useFavoritePositions'

interface FavoritePositionsModalProps {
  open: boolean
  onClose: () => void
}

function PositionGrid({
  positions,
  selectedIds,
  onToggle,
}: {
  positions: Position[]
  selectedIds: Set<number>
  onToggle: (id: number) => void
}) {
  if (positions.length === 0) {
    return (
      <p className="font-mono text-label-sm text-on-surface-variant text-center py-6">
        Nenhuma posição encontrada para esta modalidade.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {positions.map((pos) => {
        const selected = selectedIds.has(pos.id)
        return (
          <button
            key={pos.id}
            type="button"
            onClick={() => onToggle(pos.id)}
            className={`px-3 py-2 rounded-lg border text-label-sm font-mono transition-all ${
              selected
                ? 'bg-primary-container text-on-primary-container border-primary'
                : 'bg-surface-container-high text-on-surface border-outline-variant hover:border-primary/50'
            }`}
          >
            {pos.name}
          </button>
        )
      })}
    </div>
  )
}

export function FavoritePositionsModal({ open, onClose }: FavoritePositionsModalProps) {
  const [activeTab, setActiveTab] = useState<'futsal' | 'society'>('futsal')
  const { positions, loading, saving, toggleFavorite, getPositionsByGameType } = useFavoritePositions()

  const futsalPositions = getPositionsByGameType(1)
  const societyPositions = getPositionsByGameType(2)

  const currentPositions = activeTab === 'futsal' ? futsalPositions : societyPositions
  const selectedIds = new Set(currentPositions.filter((p) => {
    const fav = positions.find((pos) => pos.id === p.id)
    return fav !== undefined
  }).map((p) => p.id))

  const handleToggle = async (positionId: number) => {
    await toggleFavorite(positionId, true)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-high rounded-2xl p-6 max-w-lg w-full border border-outline-variant">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-headline-sm font-display text-on-surface">Posições Favoritas</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-surface-variant rounded-lg transition-colors"
          >
            <MaterialIcon name="close" className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant/30 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('futsal')}
            className={`flex-1 py-2 rounded-lg font-label-bold text-label-bold transition-all ${
              activeTab === 'futsal'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant/50'
            }`}
          >
            Futsal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('society')}
            className={`flex-1 py-2 rounded-lg font-label-bold text-label-bold transition-all ${
              activeTab === 'society'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant/50'
            }`}
          >
            Society
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface-variant animate-pulse rounded-lg w-full" />
            ))}
          </div>
        ) : (
          <>
            <p className="font-mono text-label-sm text-on-surface-variant mb-3">
              Selecione suas posições preferidas para {activeTab === 'futsal' ? 'Futsal' : 'Society'}:
            </p>
            <PositionGrid
              positions={currentPositions}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />
          </>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
          >
            Fechar
          </button>
          {saving && (
            <span className="flex items-center text-label-sm text-on-surface-variant">
              Salvando...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
