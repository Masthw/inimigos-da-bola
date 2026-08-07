import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export interface LeaderboardEntry {
  id: string
  name: string
  avatarUrl: string | null
  points: number
  isCurrentUser: boolean
}

export function useLeaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonStarted, setSeasonStarted] = useState(false)

  useEffect(() => {
    if (!user) return
    const currentUserId = user.id

    let cancelled = false

    async function load() {
      const [{ data: users }, { count }] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, avatar_url')
          .is('deleted_at', null)
          .order('name', { ascending: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'finished'),
      ])

      if (cancelled) return

      const rows = users ?? []
      const finishedCount = count ?? 0

      setEntries(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          avatarUrl: row.avatar_url,
          points: 0,
          isCurrentUser: row.id === currentUserId,
        })),
      )
      setSeasonStarted(finishedCount > 0)
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  return { entries, loading, seasonStarted }
}
