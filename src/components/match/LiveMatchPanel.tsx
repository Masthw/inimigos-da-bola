import { useState } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'
import { Avatar } from '../ui/Avatar'
import { Modal } from '../ui/Modal'
import { useLiveMatch, type LivePlayer } from '../../hooks/useLiveMatch'

interface LiveMatchPanelProps {
  matchId: string
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  players: LivePlayer[]
  onRefresh: () => void
}

type GoalModalMode = 'goal' | 'own_goal' | null

export function LiveMatchPanel({ matchId, teamAName, teamBName, teamAScore, teamBScore, players, onRefresh }: Readonly<LiveMatchPanelProps>) {
  const { busy, addGoal, addOwnGoal, finishMatch } = useLiveMatch()
  const [goalModal, setGoalModal] = useState<GoalModalMode>(null)
  const [finishModalOpen, setFinishModalOpen] = useState(false)
  const [selectedScorer, setSelectedScorer] = useState<string>('')
  const [selectedAssist, setSelectedAssist] = useState<string>('')
  const [selectedOwnGoalTeam, setSelectedOwnGoalTeam] = useState<string>('A')
  const [editingScore, setEditingScore] = useState<{ teamA: number; teamB: number }>({ teamA: teamAScore, teamB: teamBScore })
  const [error, setError] = useState<string | null>(null)

  const teamAPlayers = players.filter((p) => p.team === 'A')
  const teamBPlayers = players.filter((p) => p.team === 'B')
  const allPlayers = [...teamAPlayers, ...teamBPlayers]

  const resetGoalForm = () => {
    setSelectedScorer('')
    setSelectedAssist('')
    setError(null)
  }

  const handleGoalSubmit = async () => {
    if (!selectedScorer) {
      setError('Selecione o jogador que fez o gol')
      return
    }

    const scorer = allPlayers.find((p) => p.userId === selectedScorer)
    if (!scorer) return

    const result = await addGoal(matchId, selectedScorer, scorer.team, selectedAssist || null)
    if (result.error) {
      setError(result.error)
      return
    }

    resetGoalForm()
    setGoalModal(null)
    onRefresh()
  }

  const handleOwnGoalSubmit = async () => {
    const result = await addOwnGoal(matchId, selectedOwnGoalTeam)
    if (result.error) {
      setError(result.error)
      return
    }

    setGoalModal(null)
    onRefresh()
  }

  const handleFinish = async () => {
    const result = await finishMatch(matchId, editingScore.teamA, editingScore.teamB)
    if (result.error) {
      setError(result.error)
      return
    }

    setFinishModalOpen(false)
    onRefresh()
  }

  return (
    <div className="mt-4 p-4 bg-error-container/10 border border-error/30 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
        <span className="font-mono text-label-bold uppercase tracking-widest text-error">
          Partida ao Vivo
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
        <div className="text-center">
          <p className="font-mono text-label-sm text-on-surface-variant uppercase truncate">{teamAName}</p>
          <p className="display-lg font-display font-bold text-primary leading-none">{teamAScore}</p>
        </div>
        <span className="font-mono text-label-bold text-on-surface-variant">x</span>
        <div className="text-center">
          <p className="font-mono text-label-sm text-on-surface-variant uppercase truncate">{teamBName}</p>
          <p className="display-lg font-display font-bold text-on-surface leading-none">{teamBScore}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => { resetGoalForm(); setGoalModal('goal') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
        >
          <MaterialIcon name="sports_soccer" className="w-4 h-4" />
          Gol
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => { setError(null); setGoalModal('own_goal') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-warning/20 text-warning font-mono text-label-bold border border-warning/40 hover:bg-warning/30 transition-colors"
        >
          <MaterialIcon name="error" className="w-4 h-4" />
          Gol Contra
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => { setEditingScore({ teamA: teamAScore, teamB: teamBScore }); setError(null); setFinishModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-success/20 text-success font-mono text-label-bold border border-success/40 hover:bg-success/30 transition-colors ml-auto"
        >
          <MaterialIcon name="flag" className="w-4 h-4" />
          Finalizar
        </button>
      </div>

      <Modal
        open={goalModal === 'goal'}
        onClose={() => setGoalModal(null)}
        title="Marcar Gol"
        icon="sports_soccer"
        actions={
          <>
            <button
              type="button"
              onClick={() => setGoalModal(null)}
              className="px-5 py-2.5 font-mono text-label-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleGoalSubmit}
              className="px-6 py-2.5 bg-primary-container text-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
            >
              {busy ? 'Registrando...' : 'Confirmar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block font-mono text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
              Quem fez o gol?
            </label>
            <select
              value={selectedScorer}
              onChange={(e) => setSelectedScorer(e.target.value)}
              className="w-full bg-surface-variant border border-outline-variant rounded-none px-3 py-2.5 font-mono text-label-sm text-on-surface appearance-none cursor-pointer"
            >
              <option value="">Selecione o jogador</option>
              {teamAPlayers.length > 0 && (
                <optgroup label={teamAName}>
                  {teamAPlayers.map((p) => (
                    <option key={p.userId} value={p.userId}>{p.name}</option>
                  ))}
                </optgroup>
              )}
              {teamBPlayers.length > 0 && (
                <optgroup label={teamBName}>
                  {teamBPlayers.map((p) => (
                    <option key={p.userId} value={p.userId}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block font-mono text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
              Assistência (opcional)
            </label>
            <select
              value={selectedAssist}
              onChange={(e) => setSelectedAssist(e.target.value)}
              className="w-full bg-surface-variant border border-outline-variant rounded-none px-3 py-2.5 font-mono text-label-sm text-on-surface appearance-none cursor-pointer"
            >
              <option value="">Sem assistência</option>
              {teamAPlayers.length > 0 && (
                <optgroup label={teamAName}>
                  {teamAPlayers.map((p) => (
                    <option key={p.userId} value={p.userId}>{p.name}</option>
                  ))}
                </optgroup>
              )}
              {teamBPlayers.length > 0 && (
                <optgroup label={teamBName}>
                  {teamBPlayers.map((p) => (
                    <option key={p.userId} value={p.userId}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {error && (
            <p className="font-mono text-label-sm text-error">{error}</p>
          )}
        </div>
      </Modal>

      <Modal
        open={goalModal === 'own_goal'}
        onClose={() => setGoalModal(null)}
        title="Gol Contra"
        icon="error"
        actions={
          <>
            <button
              type="button"
              onClick={() => setGoalModal(null)}
              className="px-5 py-2.5 font-mono text-label-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleOwnGoalSubmit}
              className="px-6 py-2.5 bg-warning text-on-tertiary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
            >
              {busy ? 'Registrando...' : 'Confirmar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="font-body text-on-surface-variant">
            O gol será contabilizado no placar do time adversário. Nenhum jogador receberá crédito pelo gol.
          </p>
          <div>
            <label className="block font-mono text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
              Gol a favor de qual time?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedOwnGoalTeam('A')}
                className={`flex-1 py-3 font-mono text-label-bold border transition-colors ${
                  selectedOwnGoalTeam === 'A'
                    ? 'bg-primary-container text-primary border-primary'
                    : 'bg-surface-variant text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
                }`}
              >
                {teamAName}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOwnGoalTeam('B')}
                className={`flex-1 py-3 font-mono text-label-bold border transition-colors ${
                  selectedOwnGoalTeam === 'B'
                    ? 'bg-primary-container text-primary border-primary'
                    : 'bg-surface-variant text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
                }`}
              >
                {teamBName}
              </button>
            </div>
          </div>
          {error && (
            <p className="font-mono text-label-sm text-error">{error}</p>
          )}
        </div>
      </Modal>

      <Modal
        open={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        title="Finalizar Partida"
        icon="flag"
        actions={
          <>
            <button
              type="button"
              onClick={() => setFinishModalOpen(false)}
              className="px-5 py-2.5 font-mono text-label-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleFinish}
              className="px-6 py-2.5 bg-success text-white font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
            >
              {busy ? 'Finalizando...' : 'Finalizar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="font-body text-on-surface-variant">
            Confirme o placar final da partida:
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <label className="block font-mono text-label-sm text-on-surface-variant uppercase tracking-widest mb-2 text-center">
                {teamAName}
              </label>
              <input
                type="number"
                min={0}
                value={editingScore.teamA}
                onChange={(e) => setEditingScore((prev) => ({ ...prev, teamA: Number(e.target.value) }))}
                className="w-full bg-surface-variant border border-outline-variant rounded-none px-3 py-3 font-display text-headline-md text-on-surface text-center appearance-none"
              />
            </div>
            <span className="font-mono text-label-bold text-on-surface-variant pt-6">x</span>
            <div>
              <label className="block font-mono text-label-sm text-on-surface-variant uppercase tracking-widest mb-2 text-center">
                {teamBName}
              </label>
              <input
                type="number"
                min={0}
                value={editingScore.teamB}
                onChange={(e) => setEditingScore((prev) => ({ ...prev, teamB: Number(e.target.value) }))}
                className="w-full bg-surface-variant border border-outline-variant rounded-none px-3 py-3 font-display text-headline-md text-on-surface text-center appearance-none"
              />
            </div>
          </div>

          {error && (
            <p className="font-mono text-label-sm text-error">{error}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
