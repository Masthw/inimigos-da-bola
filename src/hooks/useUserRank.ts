import { useLeaderboard } from './useLeaderboard'

export function useUserRank(userId: string | undefined, groupId: string | null = null) {
  const { entries, loading, seasonStarted } = useLeaderboard(groupId)

  const index = userId ? entries.findIndex((entry) => entry.id === userId) : -1
  const rank = index >= 0 ? index + 1 : null

  return { rank, totalPlayers: entries.length, loading, seasonStarted }
}
