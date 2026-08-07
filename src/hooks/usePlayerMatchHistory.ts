import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface HistoryPlayer {
  name: string
  goals: number
  assists: number
  awards: string[]
}

export interface HistoryMatch {
  id: string
  outcome: 'victory' | 'defeat' | 'draw'
  modality: string
  date: string
  home: string
  homeScore: number
  away: string
  awayScore: number
  goals: number
  assists: number
  points: number
  awards: string[]
  homePlayers: HistoryPlayer[]
  awayPlayers: HistoryPlayer[]
}

export interface PlayerMatchHistory {
  matches: HistoryMatch[]
  badgeCounts: Record<string, number>
  loading: boolean
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function isCraqueAward(name: string): boolean {
  return name.toLowerCase().includes('craque')
}

function basePoints(outcome: HistoryMatch['outcome']): number {
  return outcome === 'victory' ? 3 : outcome === 'draw' ? 1 : 0
}

export function usePlayerMatchHistory(userId: string | undefined) {
  const [matches, setMatches] = useState<HistoryMatch[]>([])
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    const id = userId
    let cancelled = false

    async function load() {
      setLoading(true)

      const [{ data: matchesData }, { data: userRows }] = await Promise.all([
        supabase
          .from('matches')
          .select('id, date_time, team_a_name, team_a_score, team_b_name, team_b_score, game_types(name)')
          .eq('status', 'finished')
          .is('deleted_at', null)
          .order('date_time', { ascending: false }),
        supabase
          .from('match_players')
          .select('match_id, goals_scored, assists, team')
          .eq('user_id', id),
      ])

      if (cancelled) return

      const playedMatchIds = new Set((userRows ?? []).map((row) => row.match_id))
      const playedMatches = (matchesData ?? []).filter((match) => playedMatchIds.has(match.id))
      const playedIds = playedMatches.map((match) => match.id)

      const [playersRes, awardsRes] = await Promise.all([
        supabase
          .from('match_players')
          .select('match_id, user_id, guest_name, goals_scored, assists, team, users(name)')
          .in('match_id', playedIds),
        supabase
          .from('match_awards')
          .select('match_id, user_id, awards(name)')
          .in('match_id', playedIds),
      ])

      if (cancelled) return

      const playerAwards = new Map<string, string[]>()
      for (const row of awardsRes.data ?? []) {
        const name = row.awards?.name
        if (!name || !row.user_id) continue
        const key = `${row.match_id}:${row.user_id}`
        const list = playerAwards.get(key) ?? []
        list.push(name)
        playerAwards.set(key, list)
      }

      const playersByMatch = new Map<string, { home: HistoryPlayer[]; away: HistoryPlayer[] }>()
      for (const row of playersRes.data ?? []) {
        const name = row.users?.name ?? row.guest_name ?? 'Convidado'
        const awards = row.user_id ? (playerAwards.get(`${row.match_id}:${row.user_id}`) ?? []) : []
        const player: HistoryPlayer = { name, goals: row.goals_scored ?? 0, assists: row.assists ?? 0, awards }
        const entry = playersByMatch.get(row.match_id) ?? { home: [], away: [] }
        if (row.team === 'B') entry.away.push(player)
        else entry.home.push(player)
        playersByMatch.set(row.match_id, entry)
      }

      const myRows = new Map((userRows ?? []).map((row) => [row.match_id, row]))

      const result: HistoryMatch[] = playedMatches.map((match) => {
        const mine = myRows.get(match.id)
        const homeScore = match.team_a_score ?? 0
        const awayScore = match.team_b_score ?? 0
        const team = mine?.team === 'B' ? 'B' : 'A'
        const outcome: HistoryMatch['outcome'] =
          homeScore === awayScore
            ? 'draw'
            : homeScore > awayScore
              ? team === 'A'
                ? 'victory'
                : 'defeat'
              : team === 'A'
                ? 'defeat'
                : 'victory'
        const awards = playerAwards.get(`${match.id}:${id}`) ?? []
        const points = basePoints(outcome) + (awards.some(isCraqueAward) ? 1 : 0)
        const players = playersByMatch.get(match.id) ?? { home: [], away: [] }

        return {
          id: match.id,
          outcome,
          modality: match.game_types?.name ?? '',
          date: formatDay(match.date_time),
          home: match.team_a_name ?? 'Time A',
          homeScore,
          away: match.team_b_name ?? 'Time B',
          awayScore,
          goals: mine?.goals_scored ?? 0,
          assists: mine?.assists ?? 0,
          points,
          awards,
          homePlayers: players.home,
          awayPlayers: players.away,
        }
      })

      const counts: Record<string, number> = {}
      for (const name of awardsRes.data ?? []) {
        if (name.user_id !== id) continue
        const awardName = name.awards?.name
        if (!awardName) continue
        counts[awardName] = (counts[awardName] ?? 0) + 1
      }

      if (cancelled) return
      setMatches(result)
      setBadgeCounts(counts)
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [userId])

  return { matches, badgeCounts, loading }
}
