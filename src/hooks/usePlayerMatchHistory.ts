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

interface AwardRow {
  match_id: string
  user_id: string | null
  awards: { name: string } | null
}

interface PlayerRow {
  match_id: string
  user_id: string | null
  guest_name: string | null
  goals_scored: number | null
  assists: number | null
  team: string
  users: { name: string } | null
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
  if (outcome === 'victory') return 3
  if (outcome === 'draw') return 1
  return 0
}

function getOutcome(team: string, homeScore: number, awayScore: number): HistoryMatch['outcome'] {
  const myScore = team === 'A' ? homeScore : awayScore
  const opponentScore = team === 'A' ? awayScore : homeScore

  if (myScore === opponentScore) return 'draw'

  return myScore > opponentScore ? 'victory' : 'defeat'
}

function buildAwardMap(rows: AwardRow[]): Map<string, string[]> {
  const awardMap = new Map<string, string[]>()
  for (const row of rows) {
    const name = row.awards?.name
    if (!name || !row.user_id) continue
    const key = `${row.match_id}:${row.user_id}`
    const list = awardMap.get(key) ?? []
    list.push(name)
    awardMap.set(key, list)
  }
  return awardMap
}

function buildPlayersByMatch(
  rows: PlayerRow[],
  awardMap: Map<string, string[]>,
): Map<string, { home: HistoryPlayer[]; away: HistoryPlayer[] }> {
  const playersByMatch = new Map<string, { home: HistoryPlayer[]; away: HistoryPlayer[] }>()
  for (const row of rows) {
    const name = row.users?.name ?? row.guest_name ?? 'Convidado'
    const awards = row.user_id ? (awardMap.get(`${row.match_id}:${row.user_id}`) ?? []) : []
    const player: HistoryPlayer = { name, goals: row.goals_scored ?? 0, assists: row.assists ?? 0, awards }
    const entry = playersByMatch.get(row.match_id) ?? { home: [], away: [] }
    if (row.team === 'B') entry.away.push(player)
    else entry.home.push(player)
    playersByMatch.set(row.match_id, entry)
  }
  return playersByMatch
}

function countUserAwards(rows: AwardRow[], userId: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    if (row.user_id !== userId) continue
    const awardName = row.awards?.name
    if (!awardName) continue
    counts[awardName] = (counts[awardName] ?? 0) + 1
  }
  return counts
}

export function usePlayerMatchHistory(userId: string | undefined, groupId: string | null = null) {
  const [matches, setMatches] = useState<HistoryMatch[]>([])
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    const id = userId
    let cancelled = false

    // Clear stale data immediately when group changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches([]);
    setBadgeCounts({});
    setLoading(true);

    async function load() {
      setLoading(true)

      try {
        const matchQuery = supabase
          .from('matches')
          .select('id, date_time, team_a_name, team_a_score, team_b_name, team_b_score, game_types(name)')
          .eq('status', 'finished')
          .is('deleted_at', null)
          .order('date_time', { ascending: false })

        if (groupId) {
          matchQuery.eq('group_id', groupId)
        }

        const { data: matchesData } = await matchQuery

        const matchIds = (matchesData ?? []).map((m) => m.id)

        const { data: userRows } = matchIds.length > 0
          ? await supabase
              .from('match_players')
              .select('match_id, goals_scored, assists, team')
              .eq('user_id', id)
              .in('match_id', matchIds)
          : { data: [] as { match_id: string; goals_scored: number | null; assists: number | null; team: string }[] }

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

        const awardRows = awardsRes.data ?? []
        const playerAwards = buildAwardMap(awardRows)
        const playersByMatch = buildPlayersByMatch(playersRes.data ?? [], playerAwards)

        const myRows = new Map((userRows ?? []).map((row) => [row.match_id, row]))

        const result: HistoryMatch[] = playedMatches.map((match) => {
          const mine = myRows.get(match.id)
          const homeScore = match.team_a_score ?? 0
          const awayScore = match.team_b_score ?? 0
          const team = mine?.team === 'B' ? 'B' : 'A'
          const outcome = getOutcome(team, homeScore, awayScore)
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

        const counts = countUserAwards(awardRows, id)

        if (cancelled) return
        setMatches(result)
        setBadgeCounts(counts)
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [userId, groupId])

  return { matches, badgeCounts, loading }
}
