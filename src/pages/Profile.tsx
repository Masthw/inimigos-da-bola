import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../components/ui/AppShell'
import { Avatar } from '../components/ui/Avatar'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useUserProfile } from '../hooks/useUserProfile'
import { useUserRank } from '../hooks/useUserRank'
import { getFirstName } from '../lib/profile'
import { PHOTOS } from '../lib/courts'

const BADGE_CIRCLE_CLASSES: Record<string, string> = {
  primary: 'bg-primary-container border-primary text-on-primary-container',
  secondary: 'bg-secondary-container border-secondary text-on-secondary-container',
  tertiary: 'bg-tertiary-container border-tertiary text-on-tertiary-container',
}

const BADGES = [
  { icon: 'sports_soccer', title: 'Goleador', count: 3, color: 'primary' },
  { icon: 'send', title: 'Garçom', count: 1, color: 'secondary' },
  { icon: 'verified', title: 'Craque da Partida', count: 5, color: 'tertiary' },
] as const

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

const AWARD_META: Record<string, { icon: string; chip: string }> = {
  'Goleador': { icon: 'sports_soccer', chip: 'bg-primary-container text-on-primary-container' },
  'Garçom': { icon: 'send', chip: 'bg-secondary-container text-on-secondary-container' },
  'Craque da Partida': { icon: 'verified', chip: 'bg-tertiary-container text-on-tertiary-container' },
}

const BASE_POINTS: Record<string, number> = { victory: 3, draw: 1, defeat: 0 }

interface PlayerStats {
  name: string
  goals: number
  assists: number
  awards: string[]
}

interface MockMatch {
  outcome: string
  modality: string
  date: string
  home: string
  homeScore: number
  away: string
  awayScore: number
  awards: string[]
  homePlayers: PlayerStats[]
  awayPlayers: PlayerStats[]
}

const MOCK_MATCHES: MockMatch[] = [
  {
    outcome: 'victory',
    modality: 'Futsal',
    date: '06/08',
    home: 'Inimigos da Bola',
    homeScore: 4,
    away: 'Neon Bulls',
    awayScore: 2,
    awards: ['Craque da Partida', 'Goleador'],
    homePlayers: [
      { name: 'Ricardo', goals: 2, assists: 1, awards: ['Craque da Partida', 'Goleador'] },
      { name: 'Lucas', goals: 1, assists: 1, awards: ['Garçom'] },
      { name: 'Rafael', goals: 1, assists: 0, awards: [] },
      { name: 'André', goals: 0, assists: 0, awards: [] },
      { name: 'Caio', goals: 0, assists: 0, awards: [] },
    ],
    awayPlayers: [
      { name: 'Bruno', goals: 1, assists: 0, awards: [] },
      { name: 'Diego', goals: 1, assists: 1, awards: [] },
      { name: 'Edu', goals: 0, assists: 0, awards: [] },
      { name: 'Fábio', goals: 0, assists: 0, awards: [] },
      { name: 'Gustavo', goals: 0, assists: 0, awards: [] },
    ],
  },
  {
    outcome: 'defeat',
    modality: 'Society',
    date: '04/08',
    home: 'Inimigos da Bola',
    homeScore: 1,
    away: 'Cyber Titans',
    awayScore: 3,
    awards: [],
    homePlayers: [
      { name: 'Ricardo', goals: 0, assists: 0, awards: [] },
      { name: 'Lucas', goals: 0, assists: 0, awards: [] },
      { name: 'Rafael', goals: 1, assists: 0, awards: [] },
      { name: 'André', goals: 0, assists: 0, awards: [] },
      { name: 'Caio', goals: 0, assists: 0, awards: [] },
    ],
    awayPlayers: [
      { name: 'Breno', goals: 2, assists: 0, awards: ['Goleador'] },
      { name: 'Caetano', goals: 1, assists: 1, awards: ['Craque da Partida'] },
      { name: 'Diego', goals: 0, assists: 1, awards: ['Garçom'] },
      { name: 'Elias', goals: 0, assists: 1, awards: [] },
      { name: 'Fábio', goals: 0, assists: 0, awards: [] },
    ],
  },
  {
    outcome: 'draw',
    modality: 'Futsal',
    date: '01/08',
    home: 'Inimigos da Bola',
    homeScore: 2,
    away: 'Blitz United',
    awayScore: 2,
    awards: [],
    homePlayers: [
      { name: 'Ricardo', goals: 1, assists: 0, awards: [] },
      { name: 'Lucas', goals: 1, assists: 0, awards: [] },
      { name: 'Rafael', goals: 0, assists: 1, awards: ['Garçom'] },
      { name: 'André', goals: 0, assists: 1, awards: [] },
      { name: 'Caio', goals: 0, assists: 0, awards: [] },
    ],
    awayPlayers: [
      { name: 'Hugo', goals: 1, assists: 1, awards: ['Craque da Partida'] },
      { name: 'Ítalo', goals: 1, assists: 0, awards: [] },
      { name: 'Júlio', goals: 0, assists: 0, awards: [] },
      { name: 'Leandro', goals: 0, assists: 0, awards: [] },
      { name: 'Márcio', goals: 0, assists: 1, awards: [] },
    ],
  },
  {
    outcome: 'victory',
    modality: 'Society',
    date: '28/07',
    home: 'Inimigos da Bola',
    homeScore: 5,
    away: 'Ghost FC',
    awayScore: 0,
    awards: ['Craque da Partida', 'Goleador'],
    homePlayers: [
      { name: 'Ricardo', goals: 3, assists: 2, awards: ['Craque da Partida', 'Goleador'] },
      { name: 'Lucas', goals: 1, assists: 1, awards: [] },
      { name: 'Rafael', goals: 1, assists: 0, awards: [] },
      { name: 'André', goals: 0, assists: 0, awards: ['Garçom'] },
      { name: 'Caio', goals: 0, assists: 0, awards: [] },
    ],
    awayPlayers: [
      { name: 'Nando', goals: 0, assists: 0, awards: [] },
      { name: 'Otávio', goals: 0, assists: 0, awards: [] },
      { name: 'Paulo', goals: 0, assists: 0, awards: [] },
      { name: 'Raul', goals: 0, assists: 0, awards: [] },
      { name: 'Sérgio', goals: 0, assists: 0, awards: [] },
    ],
  },
]

function getMatchPoints(match: MockMatch) {
  return BASE_POINTS[match.outcome] + (match.awards.includes('Craque da Partida') ? 1 : 0)
}

function PlayerTable({ title, players }: Readonly<{ title: string; players: PlayerStats[] }>) {
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
              <tr key={player.name} className="border-t border-outline-variant/20">
                <td className="px-3 py-2 font-mono text-label-sm text-on-surface whitespace-nowrap">{player.name}</td>
                <td className="px-2 py-2 text-center font-mono text-label-sm text-on-surface">{player.goals}</td>
                <td className="px-2 py-2 text-center font-mono text-label-sm text-on-surface">{player.assists}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {player.awards.map((award) => {
                      const meta = AWARD_META[award]
                      return (
                        <span
                          key={award}
                          title={award}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${meta.chip}`}
                        >
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

function MatchCard({ match, expanded, onToggle }: Readonly<{ match: MockMatch; expanded: boolean; onToggle: () => void }>) {
  const outcome = OUTCOME_CLASSES[match.outcome]
  const points = getMatchPoints(match)

  return (
    <div className="p-4 bg-surface-container-high rounded-xl border border-outline-variant/30  transition-colors">
      <div role="button" tabIndex={0} onClick={onToggle} className="cursor-pointer select-none">
        <div className="flex justify-between items-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono text-label-bold uppercase px-2 py-0.5 rounded ${outcome.chip}`}>
              {OUTCOME_LABELS[match.outcome]}
            </span>
            <span className="text-[10px] font-mono text-label-bold uppercase px-2 py-0.5 rounded bg-surface-container text-on-surface border border-outline-variant/30">
              {match.modality}
            </span>
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

          <span className="font-mono text-label-bold text-tertiary shrink-0">+{points} pts</span>

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
  const { rank, totalPlayers } = useUserRank(userId)
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null)

  const totalMatches = MOCK_MATCHES.length
  const totalGoals = MOCK_MATCHES.reduce((sum, match) => sum + match.homePlayers[0].goals, 0)
  const totalAssists = MOCK_MATCHES.reduce((sum, match) => sum + match.homePlayers[0].assists, 0)
  const totalPoints = MOCK_MATCHES.reduce((sum, match) => sum + getMatchPoints(match), 0)
  const wins = MOCK_MATCHES.filter((match) => match.outcome === 'victory').length
  let winStreak = 0
  for (const match of MOCK_MATCHES) {
    if (match.outcome === 'victory') winStreak++
    else break
  }
  const formatAverage = (value: number) => (value / totalMatches).toFixed(1).replace('.', ',')
  const winRate = `${Math.round((wins / totalMatches) * 100)}%`

  const profileStats = [
    { label: 'Média de Gols', value: formatAverage(totalGoals), className: 'text-primary' },
    { label: 'Win Rate', value: winRate, className: 'text-secondary' },
    { label: 'Média de Assist.', value: formatAverage(totalAssists), className: 'text-tertiary' },
    { label: 'Gols', value: String(totalGoals), className: 'text-primary' },
    { label: 'Assistências', value: String(totalAssists), className: 'text-secondary' },
    { label: 'Pontos', value: String(totalPoints), className: 'text-tertiary' },
    { label: 'Vitórias Seguidas', value: String(winStreak), className: 'text-success' },
  ]

  return (
    <AppShell>
      <header className="flex items-center px-margin-mobile md:px-margin-desktop w-full h-16 border-b border-outline-variant">
        <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase">Perfil do Jogador</h2>
      </header>

      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop pt-8 space-y-12">
        {/* Hero */}
        <section className="relative rounded-2xl overflow-hidden border border-outline-variant">
          <div className="h-64 w-full relative bg-surface-container-highest">
            <img src={PHOTOS.estadio1} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
          </div>

          <div className="px-margin-mobile md:px-8 pb-8 -mt-16 relative flex flex-col md:flex-row items-end gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-surface overflow-hidden bg-surface-bright brutal-shadow shrink-0">
              <Avatar src={avatarUrl} alt={name ?? 'Jogador'} className="w-full h-full" />
            </div>

            <div className="flex-1 pb-2 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="display-lg font-display text-on-surface uppercase italic truncate">
                  {getFirstName(name ?? 'Jogador')}
                </h3>
                {rank && <span className="bg-tertiary text-on-tertiary px-3 py-1 font-mono text-label-bold rounded-sm">RANK #{rank}</span>}
              </div>
              <p className="text-on-surface font-mono text-label-bold uppercase tracking-widest mt-1">
                {loading ? 'Carregando...' : 'Temporada Atual'}
              </p>
            </div>

            <div className="flex gap-4 pb-4">
              <div className="text-center bg-surface-container px-6 py-4 rounded-xl border border-outline-variant min-w-24">
                <p className="display-lg font-display text-secondary leading-none">{totalMatches}</p>
                <p className="font-mono text-label-sm text-on-surface uppercase mt-2">Partidas</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats + Conquistas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <section className="lg:col-span-8">
            <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant h-full">
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

          <aside className="lg:col-span-4">
            <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant h-full flex flex-col">
              <h4 className="text-headline-md font-display uppercase text-primary mb-6">Conquistas</h4>
              <div className="grid grid-cols-3 gap-4">
                {BADGES.map((badge) => (
                  <div key={badge.title} className="flex flex-col items-center text-center group">
                    <div className="relative mb-3">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-110 ${BADGE_CIRCLE_CLASSES[badge.color]}`}
                      >
                        <MaterialIcon name={badge.icon} className="w-6 h-6" />
                      </div>
                      <span className="absolute -top-2 -right-2 bg-primary text-on-primary rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-mono text-label-sm font-bold">
                        {badge.count}
                      </span>
                    </div>
                    <p className="font-mono text-label-bold text-on-surface text-center">{badge.title}</p>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-outline-variant/20 mt-6">
                <p className="font-mono text-label-bold uppercase text-on-surface mb-2">Ranking da Temporada</p>
                <div className="flex items-end gap-2">
                  <p className="display-lg font-display text-primary leading-none">{rank ? `#${rank}` : '—'}</p>
                  <p className="font-mono text-label-sm text-on-surface mb-1">
                    {totalPlayers > 0 ? `de ${totalPlayers} jogadores` : 'Leaderboard Global'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Histórico */}
        <section>
          <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-headline-md font-display uppercase text-primary">Histórico de Partidas</h4>
              <MaterialIcon name="history" className="w-5 h-5 text-primary" />
            </div>

            <div className="space-y-4">
              {MOCK_MATCHES.map((match, index) => (
                <MatchCard
                  key={match.date}
                  match={match}
                  expanded={expandedMatch === index}
                  onToggle={() => setExpandedMatch(expandedMatch === index ? null : index)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
