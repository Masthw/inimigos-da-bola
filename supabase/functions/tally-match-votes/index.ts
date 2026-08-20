import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento de CORS para o navegador não bloquear a requisição
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role para ter poder total
    )

    const { matchId } = await req.json()

    if (!matchId) {
      throw new Error('matchId é obrigatório')
    }

    // 1. Buscar os awards disponíveis
    const { data: awards } = await supabaseClient.from('awards').select('*')
    
    // 2. Buscar os jogadores e seus status na partida (gols e assistências)
    const { data: players } = await supabaseClient
      .from('match_players')
      .select('user_id, goals_scored, assists')
      .eq('match_id', matchId)
      .eq('status', 'confirmed')
      .not('user_id', 'is', null) // Apenas usuários registrados recebem awards

    // 3. Buscar todos os votos dessa partida
    const { data: votes } = await supabaseClient
      .from('match_votes')
      .select('award_id, voted_user_id, voter_user_id')
      .eq('match_id', matchId)

    const awardsToInsert: { match_id: string, user_id: string, award_id: number }[] = []

    // --- AWARDS AUTOMÁTICOS (Goleador e Garçom) ---
    const goleadorAward = awards?.find(a => a.name.toLowerCase().includes('goleador'))
    const garcomAward = awards?.find(a => a.name.toLowerCase().includes('garçom') || a.name.toLowerCase().includes('garcom'))

    if (players && players.length > 0) {
      // Goleador - empate = ninguém ganha
      if (goleadorAward) {
        const sortedByGoals = [...players].sort((a, b) => (b.goals_scored || 0) - (a.goals_scored || 0))
        const topGoals = sortedByGoals[0]
        if (topGoals && topGoals.goals_scored > 0) {
          const tiedCount = sortedByGoals.filter(p => p.goals_scored === topGoals.goals_scored).length
          if (tiedCount === 1) {
            awardsToInsert.push({ match_id: matchId, user_id: topGoals.user_id, award_id: goleadorAward.id })
          }
        }
      }
      // Garçom - empate = ninguém ganha
      if (garcomAward) {
        const sortedByAssists = [...players].sort((a, b) => (b.assists || 0) - (a.assists || 0))
        const topAssist = sortedByAssists[0]
        if (topAssist && topAssist.assists > 0) {
          const tiedCount = sortedByAssists.filter(p => p.assists === topAssist.assists).length
          if (tiedCount === 1) {
            awardsToInsert.push({ match_id: matchId, user_id: topAssist.user_id, award_id: garcomAward.id })
          }
        }
      }
    }

    // --- AWARDS POR VOTAÇÃO ---
    const votingAwards = awards?.filter(a => a.is_voting_based) || []

    for (const award of votingAwards) {
      const awardVotes = votes?.filter(v => v.award_id === award.id) || []
      const isCraque = award.name.toLowerCase().includes('craque')
      
      // Contar votos por usuário
      const voteCount: Record<string, number> = {}
      for (const vote of awardVotes) {
        if (vote.voted_user_id) {
          voteCount[vote.voted_user_id] = (voteCount[vote.voted_user_id] || 0) + 1
        }
      }

      const sortedCandidates = Object.entries(voteCount).sort((a, b) => b[1] - a[1])

      if (isCraque) {
        // CRAQUE: Empate = ninguém ganha. Zero votos = default (Goleador)
        if (sortedCandidates.length > 0) {
          const maxVotes = sortedCandidates[0][1]
          const winners = sortedCandidates.filter(c => c[1] === maxVotes)
          
          if (winners.length === 1) {
            awardsToInsert.push({ match_id: matchId, user_id: winners[0][0], award_id: award.id })
          }
        } else {
          // Se todo mundo pulou (skip), o Goleador ganha o Craque por default
          const topScorer = [...(players||[])].sort((a, b) => (b.goals_scored || 0) - (a.goals_scored || 0))[0]
          if (topScorer) {
            awardsToInsert.push({ match_id: matchId, user_id: topScorer.user_id, award_id: award.id })
          }
        }
      } else {
        // OUTROS AWARDS: Vencedor precisa de 50%+ dos jogadores que votaram e sem empate no topo
        if (sortedCandidates.length > 0) {
          const uniqueVoters = new Set(awardVotes.map(v => v.voter_user_id)).size
          const [winnerId, winnerVotes] = sortedCandidates[0]
          const tiedCount = sortedCandidates.filter(c => c[1] === winnerVotes).length
          if (winnerVotes >= Math.ceil(uniqueVoters / 2) && tiedCount === 1) {
            awardsToInsert.push({ match_id: matchId, user_id: winnerId, award_id: award.id })
          }
        }
      }
    }

    // 4. Inserir os Awards no banco
    if (awardsToInsert.length > 0) {
      await supabaseClient.from('match_awards').insert(awardsToInsert)
    }

    // 5. Mudar status da partida para 'finished'
    await supabaseClient
      .from('matches')
      .update({ status: 'finished' })
      .eq('id', matchId)

    return new Response(JSON.stringify({ success: true, awarded: awardsToInsert.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})