import { MaterialIcon } from '../ui/MaterialIcon'
import { getAwardMeta } from '../../lib/awards'

interface FinishedPlayer {
  name: string
  goals: number
  assists: number
  awards: string[]
}

interface FinishedMatchCardProps {
  matchId: string
  dateTime: string
  gameTypeName: string | null
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  teamAPlayers: FinishedPlayer[]
  teamBPlayers: FinishedPlayer[]
  expanded: boolean
  onToggle: () => void
}

const OUTCOMEClasses = {
  victory: { chip: 'bg-success text-white', score: 'text-success' },
  defeat: { chip: 'bg-danger text-white', score: 'text-danger' },
  draw: { chip: 'bg-slate-500 text-white', score: 'text-on-surface' },
} as const

function getOutcome(homeScore: number, awayScore: number): 'victory' | 'defeat' | 'draw' {
  if (homeScore === awayScore) return 'draw'
  return homeScore > awayScore ? 'victory' : 'defeat'
}

const OUTCOME_LABELS: Record<string, string> = {
  victory: 'Vitória',
  defeat: 'Derrota',
  draw: 'Empate',
}

function formatShortDate(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function PlayerTable({ title, players }: Readonly<{ title: string; players: FinishedPlayer[] }>) {
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

export function FinishedMatchCard({ matchId, dateTime, gameTypeName, teamAName, teamBName, teamAScore, teamBScore, teamAPlayers, teamBPlayers, expanded, onToggle }: Readonly<FinishedMatchCardProps>) {
  const outcome = getOutcome(teamAScore, teamBScore)
  const outcomeMeta = OUTCOMEClasses[outcome]

  return (
    <div className="bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant rounded-xl p-4">
      <div role="button" tabIndex={0} onClick={onToggle} className="cursor-pointer select-none">
        <div className="flex justify-between items-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono text-label-bold uppercase px-2 py-0.5 rounded ${outcomeMeta.chip}`}>
              {OUTCOME_LABELS[outcome]}
            </span>
            {gameTypeName && (
              <span className="text-[10px] font-mono text-label-bold uppercase px-2 py-0.5 rounded bg-surface-container text-on-surface border border-outline-variant/30">
                {gameTypeName}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-label-bold text-on-surface uppercase">{formatShortDate(dateTime)}</span>
        </div>

        <div className="flex items-center gap-4">
          <p className="flex-1 min-w-0 font-body text-on-surface leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {teamAName}{' '}
            <span className={`font-bold ${outcomeMeta.score}`}>
              {teamAScore} — {teamBScore}
            </span>{' '}
            {teamBName}
          </p>

          <MaterialIcon name={expanded ? 'expand_less' : 'expand_more'} className="w-5 h-5 text-on-surface shrink-0" />
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-outline-variant/20 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="bg-surface-container rounded-xl border border-outline-variant p-4 text-center">
              <p className="font-mono text-label-sm text-on-surface uppercase truncate">{teamAName}</p>
              <p className="text-headline-md font-display font-bold text-primary">{teamAScore}</p>
            </div>
            <p className="hidden sm:block text-center font-mono text-label-bold text-on-surface">VS</p>
            <div className="bg-surface-container rounded-xl border border-outline-variant p-4 text-center">
              <p className="font-mono text-label-sm text-on-surface uppercase truncate">{teamBName}</p>
              <p className="text-headline-md font-display font-bold text-on-surface">{teamBScore}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlayerTable title={teamAName} players={teamAPlayers} />
            <PlayerTable title={teamBName} players={teamBPlayers} />
          </div>
        </div>
      )}
    </div>
  )
}
