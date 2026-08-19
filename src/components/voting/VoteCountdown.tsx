import { useEffect, useState } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'

interface VoteCountdownProps {
  endsAt: string
  isAdmin: boolean
  onEndVoting: () => void
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function VoteCountdown({ endsAt, isAdmin, onEndVoting }: Readonly<VoteCountdownProps>) {
  const [timeLeft, setTimeLeft] = useState(() => new Date(endsAt).getTime() - Date.now())
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(new Date(endsAt).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  const isUrgent = timeLeft < 10 * 60 * 1000

  return (
    <>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
        isUrgent ? 'bg-warning/15 text-warning' : 'bg-surface-variant text-on-surface-variant'
      }`}>
        <MaterialIcon name="timer" className="w-4 h-4" />
        <span className="font-mono text-label-sm font-bold tabular-nums">{formatTimeLeft(timeLeft)}</span>
      </div>

      {isAdmin && (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-error/15 text-error font-mono text-label-sm border border-error/30 active:bg-error/25 transition-colors"
        >
          <MaterialIcon name="stop" className="w-4 h-4" />
          Encerrar
        </button>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-high rounded-2xl p-6 max-w-sm w-full border border-outline-variant">
            <MaterialIcon name="warning" className="w-10 h-10 text-warning mx-auto mb-4" />
            <h3 className="text-headline-sm font-display text-on-surface text-center mb-2">Encerrar Votação?</h3>
            <p className="font-mono text-label-sm text-on-surface-variant text-center mb-6">
              A votação será encerrada imediatamente. Jogadores que ainda não votaram perderão a oportunidade.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false)
                  onEndVoting()
                }}
                className="flex-1 py-3 bg-error text-white font-mono text-label-bold active:bg-error/80 transition-colors"
              >
                Encerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
