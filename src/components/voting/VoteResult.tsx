import { Link } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import { Avatar } from '../ui/Avatar'
import { getAwardMeta } from '../../lib/awards'

export interface AwardResult {
  awardName: string;
  winnerName: string | null;
  winnerId: string | null;
  winnerAvatarUrl?: string | null;
  voteCount: number;
  isAutomatic: boolean;
  givesPoints: boolean;
}

interface VoteResultProps {
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  results: AwardResult[];
}

export function VoteResult({ teamAName, teamBName, teamAScore, teamBScore, results }: Readonly<VoteResultProps>) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <MaterialIcon name="emoji_events" className="w-12 h-12 text-tertiary mx-auto mb-3" />
        <h2 className="text-headline-md font-display text-on-surface uppercase mb-1">Resultados</h2>
        <p className="font-mono text-label-sm text-on-surface-variant">
          {teamAName} <span className="font-bold text-on-surface">{teamAScore}</span> x <span className="font-bold text-on-surface">{teamBScore}</span> {teamBName}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant text-center space-y-2">
          <MaterialIcon name="military_tech" className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
          <p className="font-mono text-label-bold text-on-surface uppercase">Nenhum prêmio atingido</p>
          <p className="font-mono text-label-sm text-on-surface-variant">
            Nenhum jogador atingiu os critérios mínimos para receber prêmios nesta partida.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => {
            const meta = getAwardMeta(result.awardName);
            return (
              <div
                key={result.awardName}
                className="rounded-2xl p-4 border bg-surface-container border-outline-variant hover:border-outline transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${meta.chip}`}>
                    <MaterialIcon
                      name={meta.icon}
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-label-bold text-on-surface uppercase tracking-wide truncate">
                        {result.awardName}
                      </p>
                      {result.givesPoints && (
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-tertiary-container text-on-tertiary-container shrink-0">
                          +1 pt
                        </span>
                      )}
                    </div>
                    {result.winnerName ? (
                      result.winnerId ? (
                        <Link
                          to={`/profile/${result.winnerId}`}
                          className="flex items-center gap-2 mt-1.5 group w-fit hover:opacity-80 transition-opacity"
                        >
                          <Avatar
                            src={result.winnerAvatarUrl ?? null}
                            alt={result.winnerName}
                            className="w-5 h-5 rounded-full shrink-0"
                          />
                          <span className="font-mono text-label-md text-on-surface font-bold truncate group-hover:text-primary group-hover:underline transition-colors">
                            {result.winnerName}
                          </span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 mt-1.5">
                          <Avatar
                            src={result.winnerAvatarUrl ?? null}
                            alt={result.winnerName}
                            className="w-5 h-5 rounded-full shrink-0"
                          />
                          <span className="font-mono text-label-md text-on-surface font-bold truncate">
                            {result.winnerName}
                          </span>
                        </div>
                      )
                    ) : (
                      <p className="font-mono text-label-sm text-on-surface-variant mt-1">
                        {result.isAutomatic ? 'Nenhum registro' : 'Sem vencedor'}
                      </p>
                    )}
                  </div>
                  {!result.isAutomatic && result.winnerName && result.voteCount > 0 && (
                    <div className="flex items-center gap-1 font-mono text-label-sm text-on-surface-variant shrink-0">
                      <MaterialIcon name="how_to_reg" className="w-4 h-4 text-on-surface-variant/70" />
                      <span>{result.voteCount} {result.voteCount === 1 ? 'voto' : 'votos'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
