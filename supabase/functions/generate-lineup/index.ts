import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { matchId } = await req.json()

    if (!matchId) {
      throw new Error('matchId é obrigatório')
    }

    // 1. Buscar jogadores confirmados
    const { data: matchPlayers } = await supabaseClient
      .from('match_players')
      .select('user_id, team, goals_scored, assists, users(name)')
      .eq('match_id', matchId)
      .eq('status', 'confirmed')
      .not('user_id', 'is', null)

    if (!matchPlayers || matchPlayers.length === 0) {
      throw new Error('Nenhum jogador confirmado')
    }

    // 2. Buscar posições favoritas
    const userIds = matchPlayers.map(p => p.user_id)
    const { data: favPositions } = await supabaseClient
      .from('user_favorite_positions')
      .select('user_id, position_id, is_primary, positions(code, name)')
      .in('user_id', userIds)

    // 3. Buscar rank dos jogadores
    const { data: matchData } = await supabaseClient
      .from('matches')
      .select('group_id, date_time')
      .eq('id', matchId)
      .single()

    let rankMap = new Map<string, number>()
    if (matchData?.group_id) {
      const { data: activeSeason } = await supabaseClient
        .from('group_seasons')
        .select('id')
        .eq('group_id', matchData.group_id)
        .lte('start_date', matchData.date_time)
        .gte('end_date', matchData.date_time)
        .single()

      if (activeSeason) {
        const { data: leaderboard } = await supabaseClient
          .from('season_leaderboards')
          .select('user_id, points')
          .eq('season_id', activeSeason.id)
          .in('user_id', userIds)

        rankMap = new Map((leaderboard || []).map(l => [l.user_id, l.points || 0]))
      }
    }

    // 4. Classificar jogadores por tipo
    const players = matchPlayers.map(p => {
      const fav = favPositions?.find(fp => fp.user_id === p.user_id)
      const positionName = fav?.positions?.code || 'MF'
      const points = rankMap.get(p.user_id) || 0
      return {
        userId: p.user_id,
        name: p.users?.name || 'Jogador',
        position: positionName,
        points,
        isGoalkeeper: positionName === 'GK',
      }
    })

    const goalkeepers = players.filter(p => p.isGoalkeeper)
    const fieldPlayers = players.filter(p => !p.isGoalkeeper)

    // 5. Algoritmo de sorteio equilibrado
    function shuffleArray<T>(arr: T[]): T[] {
      const shuffled = [...arr]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }

    // Distribui goleiros: 1 por time se possível (embaralhados para não ser sempre os mesmos)
    const shuffledGK = shuffleArray(goalkeepers)
    const teamA: typeof players = []
    const teamB: typeof players = []

    if (shuffledGK.length >= 2) {
      teamA.push(shuffledGK[0])
      teamB.push(shuffledGK[1])
    } else if (shuffledGK.length === 1) {
      teamA.push(shuffledGK[0])
    }

    // Ordena jogadores de linha por rank (maior pontuação = melhor)
    fieldPlayers.sort((a, b) => b.points - a.points)

    // Distribui de forma equilibrada (ABBA / snake draft)
    // Posições 0,3,4,7... vão pro Time A. Posições 1,2,5,6... vão pro Time B
    for (let i = 0; i < fieldPlayers.length; i++) {
      if (i % 4 === 0 || i % 4 === 3) {
        teamA.push(fieldPlayers[i])
      } else {
        teamB.push(fieldPlayers[i])
      }
    }

    // Se um time ficou com mais de 5, move os excedentes para subs
    const subs: typeof players = []
    while (teamA.length > 5) {
      const removed = teamA.pop()!
      subs.push(removed)
    }
    while (teamB.length > 5) {
      const removed = teamB.pop()!
      subs.push(removed)
    }

    // 6. Montar resposta
    const formatTeam = (team: typeof players) => team.map(p => ({
      userId: p.userId,
      name: p.name,
      position: p.position,
      points: p.points,
    }))

    return new Response(
      JSON.stringify({
        teamA: formatTeam(teamA),
        teamB: formatTeam(teamB),
        subs: formatTeam(subs),
        totalPlayers: players.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
