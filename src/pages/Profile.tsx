import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../components/ui/AppShell'
import { Avatar } from '../components/ui/Avatar'
import { ConquistasCarousel } from '../components/ui/ConquistasCarousel'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { FavoritePositionsModal } from '../components/profile/FavoritePositionsModal'
import { useUserProfile } from '../hooks/useUserProfile'
import { useUserRank } from '../hooks/useUserRank'
import { usePlayerMatchHistory, type HistoryMatch, type HistoryPlayer } from '../hooks/usePlayerMatchHistory'
import { getFirstName } from '../lib/profile'
import { PHOTOS } from '../lib/courts'
import { AWARD_BADGES, getAwardMeta } from '../lib/awards'

const OUTCOME_LABELS: Record<string, string> = {
  victory: 'Vitória',
  defeat: 'Derrota',
  draw: 'Empate',
}

const OUTCOME_CLASSES: Record<string, { chip: string; score: string }> = {
  victory: { chip: 'bg-success text-white', score: 'text-success' },
  defeat: { chip: 'bg-danger text-white', score: 'text-danger' },
  draw: { chip: 'bg-slate-500 text-white', score: 'text-on-surface' },
}

function PlayerTable({ title, players }: Readonly<{ title: string; players: HistoryPlayer[] }>) {
  return (
    <div>
      <p className="font-mono text-label-sm uppercase text-on-surface mb-2">{title}</p>
      <div className="overflow-hidden rounded-xl border border-outline-variant/30">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-on-surface">Jogador</th>
              <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-on-surface">G</th>
              <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-on-surface">A</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={`${player.name}-${title}`} className="border-t border-outline-variant/20">
                <td className="px-3 py-2 font-mono text-label-sm text-on-surface whitespace-nowrap">{player.name}</td>
                <td className="px-2 py-2 text-center font-mono text-label-sm text-on-surface">{player.goals}</td>
                <td className="px-2 py-2 text-center font-mono text-label-sm text-on-surface">{player.assists}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {player.awards.map((award) => {
                      const meta = getAwardMeta(award)
                      return (
                        <span key={award} title={award} className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${meta.chip}`}>
                          <MaterialIcon name={meta.icon} className="w-3.5 h-3.5" />
                        </span>
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MatchCard({ match, expanded, onToggle }: Readonly<{ match: HistoryMatch; expanded: boolean; onToggle: () => void }>) {
  const outcome = OUTCOME_CLASSES[match.outcome]

  return (
    <div className="p-4 bg-surface-container-high rounded-xl border border-outline-variant/30  transition-colors">
      <div role="button" tabIndex={0} onClick={onToggle} className="cursor-pointer select-none">
        <div className="flex justify-between items-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono text-label-bold uppercase px-2 py-0.5 rounded ${outcome.chip}`}>
              {OUTCOME_LABELS[match.outcome]}
            </span>
            {match.modality && (
              <span className="text-[10px] font-mono text-label-bold uppercase px-2 py-0.5 rounded bg-surface-container text-on-surface border border-outline-variant/30">
                {match.modality}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-label-bold text-on-surface uppercase">{match.date}</span>
        </div>

        <div className="flex items-center gap-4">
          <p className="flex-1 min-w-0 font-body text-on-surface leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {match.home}{' '}
            <span className={`font-bold ${outcome.score}`}>
              {match.homeScore} — {match.awayScore}
            </span>{' '}
            {match.away}
          </p>

          <span className="font-mono text-label-bold text-tertiary shrink-0">+{match.points} pts</span>

          <MaterialIcon name={expanded ? 'expand_less' : 'expand_more'} className="w-5 h-5 text-on-surface shrink-0" />
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-outline-variant/20 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="bg-surface-container rounded-xl border border-outline-variant p-4 text-center">
              <p className="font-mono text-label-sm text-on-surface uppercase truncate">{match.home}</p>
              <p className="text-headline-md font-display font-bold text-primary">{match.homeScore}</p>
            </div>
            <p className="hidden sm:block text-center font-mono text-label-bold text-on-surface">VS</p>
            <div className="bg-surface-container rounded-xl border border-outline-variant p-4 text-center">
              <p className="font-mono text-label-sm text-on-surface uppercase truncate">{match.away}</p>
              <p className="text-headline-md font-display font-bold text-on-surface">{match.awayScore}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlayerTable title={match.home} players={match.homePlayers} />
            <PlayerTable title={match.away} players={match.awayPlayers} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>()
  const { name, avatarUrl, loading } = useUserProfile(userId)
  const { rank } = useUserRank(userId)
  const { matches, badgeCounts, loading: historyLoading } = usePlayerMatchHistory(userId)
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null)
  const [showPositionsModal, setShowPositionsModal] = useState(false)

  const totalMatches = matches.length
  const totalGoals = matches.reduce((sum, match) => sum + match.goals, 0)
  const totalAssists = matches.reduce((sum, match) => sum + match.assists, 0)
  const totalPoints = matches.reduce((sum, match) => sum + match.points, 0)
  const wins = matches.filter((match) => match.outcome === 'victory').length
  let winStreak = 0
  for (const match of matches) {
    if (match.outcome === 'victory') winStreak++
    else break
  }
  const formatAverage = (value: number) => (totalMatches > 0 ? (value / totalMatches).toFixed(1).replace('.', ',') : '0,0')
  const winRate = totalMatches > 0 ? `${Math.round((wins / totalMatches) * 100)}%` : '—'

  const profileStats = [
    { label: 'Média de Gols', value: historyLoading ? '…' : formatAverage(totalGoals), className: 'text-primary' },
    { label: 'Win Rate', value: historyLoading ? '…' : winRate, className: 'text-secondary' },
    { label: 'Média de Assist.', value: historyLoading ? '…' : formatAverage(totalAssists), className: 'text-tertiary' },
    { label: 'Gols', value: historyLoading ? '…' : String(totalGoals), className: 'text-primary' },
    { label: 'Assistências', value: historyLoading ? '…' : String(totalAssists), className: 'text-secondary' },
    { label: 'Pontos', value: historyLoading ? '…' : String(totalPoints), className: 'text-tertiary' },
    { label: 'Vitórias Seguidas', value: historyLoading ? '…' : String(winStreak), className: 'text-success' },
  ]

  const normalizedBadgeCounts: Record<string, number> = {}
  for (const [name, count] of Object.entries(badgeCounts)) {
    const title = getAwardMeta(name).title
    normalizedBadgeCounts[title] = (normalizedBadgeCounts[title] ?? 0) + count
  }
  const badges = AWARD_BADGES.map((badge) => ({ icon: badge.icon, title: badge.name, count: normalizedBadgeCounts[badge.name] ?? 0, className: badge.className })).filter(
    (badge) => badge.count > 0,
  )

  return (
    <AppShell>
      <header className="flex items-center px-margin-mobile md:px-margin-desktop w-full h-16 border-b border-outline-variant">
        <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase">Perfil do Jogador</h2>
        <button
          type="button"
          onClick={() => setShowPositionsModal(true)}
          className="ml-4 px-3 py-1.5 bg-surface-variant text-on-surface font-mono text-[10px] border border-outline-variant active:bg-surface-container-high transition-colors rounded-lg"
        >
          Posições Favoritas
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop pt-8 space-y-12">
        {/* Hero */}
        <section className="relative rounded-2xl overflow-hidden border border-outline-variant">
          <div className="h-64 w-full relative bg-surface-container-highest">
            <img src={PHOTOS.estadio1} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" />
            <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/40 to-transparent" />
          </div>

          <div className="px-margin-mobile md:px-8 pb-8 -mt-16 relative">
            <div className="flex flex-col items-center md:flex-row md:items-end gap-6 text-center md:text-left">
              <div className="w-30 h-30 rounded-2xl border-4 border-surface overflow-hidden bg-surface-bright brutal-shadow shrink-0">
                <Avatar src={avatarUrl} alt={name ?? 'Jogador'} className="w-full h-full" />
              </div>

              <div className="flex-1 pb-2 min-w-0">
                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                  <h3 className="display-lg font-display text-on-surface uppercase italic truncate">
                    {getFirstName(name ?? 'Jogador')}
                  </h3>
                  {!!(rank) && <span className="bg-tertiary text-on-tertiary px-3 py-1 font-mono text-label-bold rounded-sm">RANK #{rank}</span>}
                </div>
                <p className="text-on-surface font-mono text-label-bold uppercase tracking-widest mt-1">
                  {loading ? 'Carregando...' : 'Temporada Atual'}
                </p>
              </div>

              <div className="flex gap-4 pb-4">
                <div className="text-center bg-surface-container px-6 py-4 rounded-xl border border-outline-variant min-w-24">
                  <p className="display-lg font-display text-secondary leading-none">{historyLoading ? '…' : totalMatches}</p>
                  <p className="font-mono text-label-sm text-on-surface uppercase mt-2">Partidas</p>
                </div>
              </div>
            </div>

            <div className="mt-6 md:mt-8">
              <p className="font-mono text-label-sm uppercase text-on-surface tracking-widest mb-3">Conquistas</p>
              {historyLoading ? (
                <div className="flex gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-11 w-40 rounded-full bg-surface-variant animate-pulse" />
                  ))}
                </div>
              ) : badges.length === 0 ? (
                <p className="font-mono text-label-sm text-on-surface-variant">
                  Nenhuma conquista ainda — os prêmios aparecem aqui depois das partidas
                </p>
              ) : (
                <ConquistasCarousel badges={badges} />
              )}
            </div>
          </div>
        </section>

        {/* Estatísticas */}
        <section>
          <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant">
            <h4 className="text-headline-md font-display uppercase text-primary mb-6">Estatísticas</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {profileStats.map((stat) => (
                <div key={stat.label} className="bg-surface-container-high rounded-xl border border-outline-variant px-3 py-4 text-center">
                  <p className={`text-headline-md font-display leading-none ${stat.className}`}>{stat.value}</p>
                  <p className="font-mono text-[10px] leading-tight break-words text-on-surface uppercase mt-2">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Histórico */}
        <section>
          <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-headline-md font-display uppercase text-primary">Histórico de Partidas</h4>
              <MaterialIcon name="history" className="w-5 h-5 text-primary" />
            </div>

            {historyLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-surface-variant animate-pulse rounded-xl" />
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-high rounded-xl border border-outline-variant/30">
                <MaterialIcon name="history" className="w-8 h-8 text-on-surface-variant mx-auto mb-3" />
                <p className="font-mono text-label-bold text-on-surface">Nenhuma partida finalizada ainda</p>
                <p className="font-mono text-label-sm text-on-surface-variant mt-1">
                  O histórico aparece depois que o jogador entrar em campo
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match, index) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    expanded={expandedMatch === index}
                    onToggle={() => setExpandedMatch(expandedMatch === index ? null : index)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <FavoritePositionsModal open={showPositionsModal} onClose={() => setShowPositionsModal(false)} />
    </AppShell>
  )
}
