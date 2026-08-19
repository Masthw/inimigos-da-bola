import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/ui/AppShell'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Avatar } from '../components/ui/Avatar'
import { VoteCard } from '../components/voting/VoteCard'
import { VoteCountdown } from '../components/voting/VoteCountdown'
import { useVoting } from '../hooks/useVoting'
import { useAuth } from '../hooks/useAuth'
import { useIsAdmin } from '../hooks/useIsAdmin'

export default function VoteMatch() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin } = useIsAdmin()
  const { votingData, loading, saving, error, submitVote, hasVoted, getVotedPlayers } = useVoting(matchId)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const craqueAward = votingData?.awards.find((a) => a.name.toLowerCase().includes('craque'))
  const votingAwards = votingData?.awards.filter((a) => !a.isAutomatic) ?? []
  const allVoted = craqueAward ? hasVoted(craqueAward.id) : false

  useEffect(() => {
    if (!loading && votingData) {
      const now = new Date().getTime()
      const endsAt = new Date(votingData.votingEndsAt).getTime()
      if (now > endsAt) {
        navigate('/matches')
      }
    }
  }, [loading, votingData, navigate])

  const goalScorer = useMemo(() => {
    if (!votingData) return null
    const sorted = [...votingData.players].sort((a, b) => b.goalsScored - a.goalsScored)
    return sorted[0]?.goalsScored > 0 ? sorted[0] : null
  }, [votingData])

  const assistKing = useMemo(() => {
    if (!votingData) return null
    const sorted = [...votingData.players].sort((a, b) => b.assists - a.assists)
    return sorted[0]?.assists > 0 ? sorted[0] : null
  }, [votingData])

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="font-mono text-label-sm text-on-surface-variant">Carregando votação...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !votingData || !user) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <MaterialIcon name="error" className="w-10 h-10 text-error mx-auto mb-4" />
            <p className="font-mono text-label-bold text-on-surface">{error || 'Erro ao carregar votação'}</p>
            <button
              type="button"
              onClick={() => navigate('/matches')}
              className="mt-4 px-4 py-2 font-mono text-label-sm text-primary hover:bg-surface-variant transition-colors"
            >
              Voltar para partidas
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="min-h-[calc(100svh-4rem)] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container">
          <div className="flex items-center gap-2">
            <MaterialIcon name="how_to_vote" className="w-5 h-5 text-primary" />
            <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase">Votação</h2>
          </div>
          <VoteCountdown
            endsAt={votingData.votingEndsAt}
            isAdmin={isAdmin}
            onEndVoting={() => {}}
          />
        </header>

        <div className="px-4 py-3 bg-surface-container-high border-b border-outline-variant">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex-1 text-right">
              <p className="font-mono text-label-sm uppercase truncate" style={{ color: votingData.teamAColor }}>{votingData.teamAName}</p>
              <p className="display-lg font-display font-bold leading-none" style={{ color: votingData.teamAColor }}>{votingData.teamAScore}</p>
            </div>
            <span className="text-headline-md font-mono text-on-surface-variant">x</span>
            <div className="flex-1 text-left">
              <p className="font-mono text-label-sm uppercase truncate" style={{ color: votingData.teamBColor }}>{votingData.teamBName}</p>
              <p className="display-lg font-display font-bold leading-none" style={{ color: votingData.teamBColor }}>{votingData.teamBScore}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {goalScorer && (
              <div className="flex items-center gap-2 p-2 bg-primary-container/30 rounded-lg">
                <MaterialIcon name="sports_soccer" className="w-4 h-4 text-primary" />
                <Avatar src={null} alt={goalScorer.name} className="w-5 h-5 rounded-full" />
                <span className="font-mono text-[10px] text-on-surface truncate">{goalScorer.name}</span>
                <span className="font-mono text-[9px] text-on-surface-variant ml-auto">{goalScorer.goalsScored}G</span>
              </div>
            )}
            {assistKing && (
              <div className="flex items-center gap-2 p-2 bg-secondary-container/30 rounded-lg">
                <MaterialIcon name="send" className="w-4 h-4 text-secondary" />
                <Avatar src={null} alt={assistKing.name} className="w-5 h-5 rounded-full" />
                <span className="font-mono text-[10px] text-on-surface truncate">{assistKing.name}</span>
                <span className="font-mono text-[9px] text-on-surface-variant ml-auto">{assistKing.assists}A</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-3">
          {votingAwards.map((award) => (
            <VoteCard
              key={award.id}
              award={award}
              players={votingData.players}
              currentUserId={user.id}
              votedPlayers={getVotedPlayers(award.id)}
              hasVoted={hasVoted(award.id)}
              onVote={(playerId) => submitVote(award.id, playerId)}
              disabled={saving}
            />
          ))}
        </div>

        <div className="px-4 py-4 border-t border-outline-variant bg-surface-container">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="w-full py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
          >
            {allVoted ? 'Sair da Votação' : 'Sair sem votar em tudo'}
          </button>
        </div>

        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-high rounded-2xl p-6 max-w-sm w-full border border-outline-variant">
              <MaterialIcon name="logout" className="w-10 h-10 text-warning mx-auto mb-4" />
              <h3 className="text-headline-sm font-display text-on-surface text-center mb-2">Sair da Votação?</h3>
              <p className="font-mono text-label-sm text-on-surface-variant text-center mb-6">
                {allVoted
                  ? 'Seus votos já foram registrados. Tem certeza que deseja sair?'
                  : 'Você ainda não votou em todas as categorias. Seus votos registrados serão mantidos, mas você não poderá voltar.'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
                >
                  Ficar
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/matches')}
                  className="flex-1 py-3 bg-primary text-on-primary font-mono text-label-bold active:bg-primary/80 transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}