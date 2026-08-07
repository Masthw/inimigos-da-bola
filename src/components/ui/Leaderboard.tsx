import { Link } from 'react-router-dom'
import { MaterialIcon } from './MaterialIcon'
import { useLeaderboard } from '../../hooks/useLeaderboard'

const BORDER_CLASSES = ['border-tertiary', 'border-outline', 'border-secondary-container']
const BG_CLASSES = ['bg-surface-container-highest', 'bg-surface-container-low', 'bg-surface-container-low']
const POS_CLASSES = ['text-tertiary', 'text-on-surface-variant', 'text-on-surface-variant']

export function Leaderboard() {
  const { entries, loading, seasonStarted } = useLeaderboard()

  return (
    <section className="md:col-span-4 md:h-120">
      
      <div className="bg-surface-container rounded-xl border border-outline-variant p-stack-md h-full flex flex-col">
        
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-headline-md font-display text-primary uppercase">Leaderboard</h3>
          <MaterialIcon name="military_tech" className="w-5 h-5 text-tertiary" />
        </div>

        {!seasonStarted && !loading && (
          <div className="flex items-start gap-3 mb-6 p-3 bg-tertiary-container/20 border border-tertiary/30 rounded-lg shrink-0">
            <MaterialIcon name="event_available" className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
            <p className="font-mono text-label-sm text-on-surface-variant leading-relaxed">
              A temporada ainda não começou. Os pontos passam a valer na primeira partida finalizada.
            </p>
          </div>
        )}

        <div className="space-y-4 flex-1 flex flex-col justify-center min-h-0">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface-variant animate-pulse rounded-lg w-full" />
            ))}

          {!loading &&
            entries.slice(0, 3).map((p, index) => {
              const pos = index + 1
              const isTop3 = pos <= 3 
              const isCurrent = p.isCurrentUser

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 ${isTop3 ? BG_CLASSES[pos - 1] : 'bg-surface-container-low'} rounded-lg border-l-4 ${
                    isTop3 ? BORDER_CLASSES[pos - 1] : 'border-outline-variant'
                  } ${isCurrent ? 'ring-1 ring-primary' : ''} w-full`}
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0 mr-2">
                    <span
                      className={`font-mono text-label-bold ${isTop3 ? POS_CLASSES[pos - 1] : 'text-on-surface-variant'} w-4 shrink-0`}
                    >
                      {pos}
                    </span>
                    <Link to={`/profile/${p.id}`} className="shrink-0" aria-label={`Perfil de ${p.name}`}>
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
                        {p.avatarUrl ? (
                          <img className="w-full h-full object-cover" src={p.avatarUrl} alt={p.name} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                            <MaterialIcon name="person" className="w-5 h-5 text-on-surface-variant" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <span className="font-body font-bold text-on-surface truncate">{p.name}</span>
                    {isCurrent && (
                      <span className="ml-1 px-2 py-0.5 bg-primary text-on-primary font-mono text-label-sm uppercase shrink-0">
                        Você
                      </span>
                    )}
                  </div>
                  
                  <span
                    className={`font-mono text-label-bold whitespace-nowrap shrink-0 ${pos === 1 && seasonStarted ? 'text-tertiary' : 'text-on-surface-variant'}`}
                  >
                    {p.points} pts
                  </span>
                </div>
              )
            })}
        </div>

        <Link to="/rankings" className="w-full mt-6 shrink-0 text-primary font-mono text-label-sm flex items-center justify-center gap-1 hover:underline">
          Ver Ranking Completo
          <MaterialIcon name="arrow_forward" className="w-4 h-4" />
        </Link>
      </div>
    </section>
  )
}