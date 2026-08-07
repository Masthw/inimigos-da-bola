import { useLeaderboard } from './useLeaderboard'

export function useUserRank(userId: string | undefined) {
  const { entries, loading, seasonStarted } = useLeaderboard()

  const index = userId ? entries.findIndex((entry) => entry.id === userId) : -1
  const rank = index >= 0 ? index + 1 : null

  return { rank, totalPlayers: entries.length, loading, seasonStarted }
}
