import { Link } from 'react-router-dom'
import { AppShell } from '../components/ui/AppShell'
import { NextMatch } from '../components/ui/NextMatch'
import { Leaderboard } from '../components/ui/Leaderboard'
import { StatCard } from '../components/ui/StatCard'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useHomeDashboard } from '../hooks/useHomeDashboard'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const { playerStats, matchesPlayed, loading } = useHomeDashboard()
  const { user } = useAuth()

  return (
    <AppShell>
      <div className="p-4 md:p-margin-desktop">
        <div className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-[28px] md:text-headline-lg font-display text-primary uppercase leading-tight font-bold">
              Dashboard
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          <NextMatch />
          <Leaderboard />

          <section className="md:col-span-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
              <Link
                to={`/profile/${user?.id ?? ''}`}
                className="inline-flex items-center gap-2 group/statlink hover:text-primary transition-colors"
              >
                <h3 className="text-headline-md font-display text-on-surface uppercase group-hover/statlink:text-primary transition-colors">
                  Minhas Estatísticas
                </h3>
                <MaterialIcon
                  name="arrow_forward"
                  className="w-5 h-5 text-on-surface-variant group-hover/statlink:text-primary transition-colors"
                />
              </Link>
              {!loading && matchesPlayed === 0 && (
                <p className="font-mono text-label-sm text-on-surface-variant">
                  Sem partidas finalizadas — estatísticas começam quando a temporada começar
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-gutter">
              {playerStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          </section>

          <section className="md:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter"></div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}