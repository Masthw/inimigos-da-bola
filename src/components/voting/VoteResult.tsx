import { MaterialIcon } from '../ui/MaterialIcon'
import { Avatar } from '../ui/Avatar'

interface AwardResult {
  awardName: string
  winnerName: string | null
  winnerId: string | null
  voteCount: number
  isAutomatic: boolean
  givesPoints: boolean
}

interface VoteResultProps {
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  results: AwardResult[]
}

export function VoteResult({ teamAName, teamBName, teamAScore, teamBScore, results }: Readonly<VoteResultProps>) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <MaterialIcon name="emoji_events" className="w-12 h-12 text-tertiary mx-auto mb-3" />
        <h2 className="text-headline-md font-display text-on-surface uppercase mb-1">Resultados</h2>
        <p className="font-mono text-label-sm text-on-surface-variant">
          {teamAName} {teamAScore} x {teamBScore} {teamBName}
        </p>
      </div>

      <div className="space-y-3">
        {results.map((result, i) => (
          <div
            key={`${result.awardName}-${i}`}
            className={`rounded-2xl p-4 border ${
              result.winnerName
                ? 'bg-primary/5 border-primary/20'
                : 'bg-surface-container border-outline-variant'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                result.winnerName ? 'bg-primary/20' : 'bg-surface-variant'
              }`}>
                <MaterialIcon
                  name={result.isAutomatic ? 'lock' : 'emoji_events'}
                  className={`w-6 h-6 ${result.winnerName ? 'text-primary' : 'text-on-surface-variant'}`}
                />
              </div>
              <div className="flex-1">
                <p className="font-mono text-label-bold text-on-surface uppercase">{result.awardName}</p>
                {result.winnerName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar src={null} alt={result.winnerName} className="w-5 h-5 rounded-full" />
                    <span className="font-mono text-label-sm text-primary font-bold">{result.winnerName}</span>
                    {result.givesPoints && (
                      <span className="font-mono text-[9px] text-primary/70">+1 pt</span>
                    )}
                  </div>
                ) : (
                  <p className="font-mono text-label-sm text-on-surface-variant mt-1">
                    {result.isAutomatic ? 'Nenhum registro' : 'Sem vencedor'}
                  </p>
                )}
              </div>
              {!result.isAutomatic && result.winnerName && (
                <span className="font-mono text-label-sm text-on-surface-variant">{result.voteCount} votos</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
