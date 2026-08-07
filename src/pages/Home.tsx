import { Sidebar } from '../components/ui/Sidebar'
import { MobileTopBar } from '../components/ui/MobileTopBar'
import { MobileBottomNav } from '../components/ui/MobileBottomNav'
import { NextMatch } from '../components/ui/NextMatch'
import { Leaderboard } from '../components/ui/Leaderboard'
import { StatCard } from '../components/ui/StatCard'
import { useHomeDashboard } from '../hooks/useHomeDashboard' 

export default function Home() {
  const { playerStats, matchesPlayed, loading } = useHomeDashboard()

  return (
    <div className="bg-background text-on-background">
      <Sidebar />
      <MobileTopBar />

      <main className="md:ml-64 p-4 md:p-margin-desktop min-h-screen pb-24 md:pb-margin-desktop">
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
              <h3 className="text-headline-md font-display text-on-surface uppercase">Minhas Estatísticas</h3>
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
      </main>

      <MobileBottomNav />
    </div>
  )
}