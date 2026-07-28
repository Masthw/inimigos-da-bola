import { Link } from 'react-router-dom'
import { MaterialIcon } from './MaterialIcon'
import { LEADERBOARD, AVATARS } from '../../data/mockData'

const BORDER_CLASSES = ['border-tertiary', 'border-outline', 'border-secondary-container']
const BG_CLASSES = ['bg-surface-container-highest', 'bg-surface-container-low', 'bg-surface-container-low']
const POS_CLASSES = ['text-tertiary', 'text-on-surface-variant', 'text-on-surface-variant']

export function Leaderboard() {
  const avatarMap: Record<number, string> = { 1: AVATARS.rank1, 2: AVATARS.rank2, 3: AVATARS.rank3 }

  return (
    <section className="md:col-span-4">
      <div className="bg-surface-container rounded-xl border border-outline-variant p-stack-md h-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-headline-md font-display text-primary uppercase">Leaderboard</h3>
          <MaterialIcon name="more_horiz" className="w-5 h-5 text-on-surface-variant" />
        </div>

        <div className="space-y-4">
          {LEADERBOARD.map((p) => (
            <div key={p.pos} className={`flex items-center justify-between p-3 ${BG_CLASSES[p.pos - 1]} rounded-lg border-l-4 ${BORDER_CLASSES[p.pos - 1]}`}>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-label-bold ${POS_CLASSES[p.pos - 1]} w-4`}>{p.pos}</span>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
                  <img className="w-full h-full object-cover" src={avatarMap[p.pos]} alt={p.name} />
                </div>
                <span className="font-body font-bold text-on-surface">{p.name}</span>
              </div>
              <span className={`font-mono text-label-bold ${p.pos === 1 ? 'text-tertiary' : 'text-on-surface-variant'}`}>{p.pts}</span>
            </div>
          ))}
        </div>

        <Link to="/rankings" className="w-full mt-6 text-primary font-mono text-label-sm flex items-center justify-center gap-1 hover:underline">
          Ver Ranking Completo
          <MaterialIcon name="arrow_forward" className="w-4 h-4" />
        </Link>
      </div>
    </section>
  )
}
