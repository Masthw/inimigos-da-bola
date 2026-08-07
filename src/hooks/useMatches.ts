import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export type PlayerStatus = 'confirmed' | 'waitlist' | 'cancelled'

export interface MatchPlayer {
  name: string
  avatarUrl: string | null
}

export interface MatchWithMeta {
  id: string
  dateTime: string
  location: string
  status: 'open' | 'in_progress' | 'finished'
  maxPlayers: number
  maxWaitlist: number
  teamAName: string | null
  teamBName: string | null
  teamAScore: number | null
  teamBScore: number | null
  sportName: string | null
  gameTypeName: string | null
  confirmedCount: number
  waitlistCount: number
  confirmedPlayers: MatchPlayer[]
  waitlistPlayers: MatchPlayer[]
}

export interface MatchGroups {
  featured: MatchWithMeta | null
  upcoming: MatchWithMeta[]
  finished: MatchWithMeta[]
}

interface MatchRow {
  id: string
  date_time: string
  location: string
  status: MatchWithMeta['status']
  max_players: number
  max_waitlist: number
  team_a_name: string | null
  team_b_name: string | null
  team_a_score: number | null
  team_b_score: number | null
  game_types: { name: string | null; sports: { name: string | null } | null } | null
}

interface PlayerRow {
  match_id: string
  status: PlayerStatus
  user_id: string | null
  guest_name: string | null
  users: { name: string | null; avatar_url: string | null } | null
}

function sortByDate(rows: MatchWithMeta[], ascending: boolean) {
  return [...rows].sort((a, b) => {
    const diff = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    return ascending ? diff : -diff
  })
}

async function fetchMatchesData(userId: string | null) {
  const [matchesResult, playersResult] = await Promise.all([
    supabase
      .from('matches')
      .select(
        'id, date_time, location, status, max_players, max_waitlist, team_a_name, team_b_name, team_a_score, team_b_score, game_types(name, sports(name))'
      )
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .order('date_time', { ascending: true }),
    supabase.from('match_players').select('match_id, status, user_id, guest_name, users(name, avatar_url)'),
  ])

  if (matchesResult.error) throw matchesResult.error

  const confirmedCounts = new Map<string, number>()
  const waitlistCounts = new Map<string, number>()
  const playersByMatch = new Map<string, { confirmed: MatchPlayer[]; waitlist: MatchPlayer[] }>()
  const myStatusMap: Record<string, PlayerStatus | undefined> = {}

  for (const row of (playersResult.data ?? []) as PlayerRow[]) {
    if (row.status === 'confirmed') {
      confirmedCounts.set(row.match_id, (confirmedCounts.get(row.match_id) ?? 0) + 1)
    } else if (row.status === 'waitlist') {
      waitlistCounts.set(row.match_id, (waitlistCounts.get(row.match_id) ?? 0) + 1)
    }
    if (userId && row.user_id === userId) {
      myStatusMap[row.match_id] = row.status
    }

    const name = row.users?.name ?? row.guest_name ?? 'Convidado'
    const player: MatchPlayer = { name, avatarUrl: row.users?.avatar_url ?? null }
    const entry = playersByMatch.get(row.match_id) ?? { confirmed: [], waitlist: [] }
    if (row.status === 'confirmed') {
      entry.confirmed.push(player)
    } else if (row.status === 'waitlist') {
      entry.waitlist.push(player)
    }
    playersByMatch.set(row.match_id, entry)
  }

  const rows: MatchWithMeta[] = (matchesResult.data ?? [] as MatchRow[]).map((match) => {
    const players = playersByMatch.get(match.id) ?? { confirmed: [], waitlist: [] }
    return {
      id: match.id,
      dateTime: match.date_time,
      location: match.location,
      status: match.status as MatchWithMeta['status'],
      maxPlayers: match.max_players,
      maxWaitlist: match.max_waitlist,
      teamAName: match.team_a_name,
      teamBName: match.team_b_name,
      teamAScore: match.team_a_score,
      teamBScore: match.team_b_score,
      sportName: match.game_types?.name ?? match.game_types?.sports?.name ?? null,
      gameTypeName: match.game_types?.name ?? null,
      confirmedCount: confirmedCounts.get(match.id) ?? 0,
      waitlistCount: waitlistCounts.get(match.id) ?? 0,
      confirmedPlayers: players.confirmed,
      waitlistPlayers: players.waitlist,
    }
  })

  return { rows, myStatusMap }
}

const EMPTY_GROUPS: MatchGroups = { featured: null, upcoming: [], finished: [] }

export function useMatches() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [groups, setGroups] = useState<MatchGroups>(EMPTY_GROUPS)
  const [myStatus, setMyStatus] = useState<Record<string, PlayerStatus | undefined>>({})
  const [loading, setLoading] = useState(true)
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null)

  const applyData = useCallback(({ rows, myStatusMap }: { rows: MatchWithMeta[]; myStatusMap: Record<string, PlayerStatus | undefined> }) => {
    const now = Date.now()
    const openMatches = rows.filter((match) => match.status === 'open')
    const inProgress = rows.filter((match) => match.status === 'in_progress')

    let featured: MatchWithMeta | null = null
    if (inProgress.length > 0) {
      featured = inProgress[0]
    } else {
      featured = openMatches.find((match) => new Date(match.dateTime).getTime() >= now) ?? null
    }

    const upcoming = sortByDate(
      openMatches.filter(
        (match) => match.id !== featured?.id && new Date(match.dateTime).getTime() >= now
      ),
      true
    )

    const finished = sortByDate(
      rows.filter((match) => match.status === 'finished'),
      false
    )

    setGroups({ featured, upcoming, finished })
    setMyStatus(myStatusMap)
    setLoading(false)
  }, [])

  const refetch = useCallback(() => {
    fetchMatchesData(userId).then(applyData).catch((error) => {
      console.error('Erro ao buscar partidas:', error)
    })
  }, [userId, applyData])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          refetch()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_players' },
        () => {
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  const setAttendance = useCallback(
    async (matchId: string, status: PlayerStatus) => {
      if (!userId) return

      setBusyMatchId(matchId)

      const { data: existing } = await supabase
        .from('match_players')
        .select('id')
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .maybeSingle()

      const result = existing
        ? await supabase.from('match_players').update({ status }).eq('id', existing.id)
        : await supabase
            .from('match_players')
            .insert({ match_id: matchId, user_id: userId, status })

      setBusyMatchId(null)

      if (result.error) {
        console.error('Erro ao atualizar presença:', result.error)
        return
      }

      refetch()
    },
    [userId, refetch]
  )

  const cancelMatch = useCallback(
    async (matchId: string) => {
      if (!userId) return

      setBusyMatchId(matchId)

      const { error } = await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', matchId)

      setBusyMatchId(null)

      if (error) {
        console.error('Erro ao cancelar partida:', error)
        return
      }

      refetch()
    },
    [userId, refetch]
  )

  return { ...groups, loading, busyMatchId, myStatus, setAttendance, cancelMatch }
}
