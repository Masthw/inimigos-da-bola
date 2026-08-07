import { useAuth } from './useAuth'
import { usePlayerStats } from './usePlayerStats'

export function useHomeDashboard() {
  const { user } = useAuth()
  const { stats, loading } = usePlayerStats(user?.id ?? null)

  let winRateValue = '—'
  
  if (loading) {
    winRateValue = '…'
  } else if (stats?.winRate !== null && stats?.winRate !== undefined) {
    winRateValue = `${stats.winRate}%`
  }

  const playerStats = [
    {
      label: 'Gols',
      value: loading ? '…' : String(stats?.goals ?? 0),
      colorClass: 'text-primary',
      hoverBgClass: 'bg-primary-container',
      hoverTextClass: 'text-on-primary-container',
    },
    {
      label: 'Assistências',
      value: loading ? '…' : String(stats?.assists ?? 0),
      colorClass: 'text-secondary',
      hoverBgClass: 'bg-secondary-container',
      hoverTextClass: 'text-on-secondary-container',
    },
    {
      label: 'Partidas',
      value: loading ? '…' : String(stats?.matchesPlayed ?? 0),
      colorClass: 'text-primary',
      hoverBgClass: 'bg-primary-container',
      hoverTextClass: 'text-on-primary-container',
    },
    {
      label: 'Vitórias',
      value: loading ? '…' : String(stats?.wins ?? 0),
      colorClass: 'text-secondary',
      hoverBgClass: 'bg-secondary-container',
      hoverTextClass: 'text-on-secondary-container',
    },
    {
      label: 'Taxa de Vitórias',
      value: winRateValue,
      colorClass: 'text-tertiary',
      hoverBgClass: 'bg-tertiary-container',
      hoverTextClass: 'text-on-tertiary-container',
    },
  ]

  return {
    playerStats,
    matchesPlayed: stats?.matchesPlayed ?? 0,
    loading,
  }
}