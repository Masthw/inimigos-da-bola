import { SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders, FunctionError, jsonResponse, requireAdmin } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const headers = corsHeaders(req);

  // Tratamento de CORS para o navegador não bloquear a requisição
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Apenas admins autenticados podem encerrar uma partida
    const { adminClient } = await requireAdmin(req);

    const { matchId, groupId } = await req.json().catch(() => ({}));

    if (!matchId) {
      throw new FunctionError(400, 'matchId é obrigatório');
    }

    const { data: matchRow, error: matchFetchError } = await adminClient
      .from('matches')
      .select('group_id')
      .eq('id', matchId)
      .single();
    if (matchFetchError) throw matchFetchError;
    if (groupId && matchRow?.group_id !== groupId) {
      throw new FunctionError(403, 'Partida não pertence ao grupo informado');
    }

    // Claim atômico: apenas UMA execução consegue mudar o status da partida.
    // Se 0 linhas foram afetadas, esta partida já foi processada antes.
    const { data: claimed, error: claimError } = await adminClient
      .from('matches')
      .update({ status: 'finished' })
      .eq('id', matchId)
      .neq('status', 'finished')
      .select('id, game_type_id');

    if (claimError) throw claimError;
    if (!claimed || claimed.length === 0) {
      return jsonResponse({ success: true, alreadyProcessed: true }, 200, headers);
    }

    await tallyMatch(adminClient, matchId, claimed[0].game_type_id);

    return jsonResponse({ success: true }, 200, headers);
  } catch (error) {
    if (error instanceof FunctionError) {
      return jsonResponse({ error: error.message }, error.status, headers);
    }
    console.error('tally-match-votes:', error);
    return jsonResponse(
      { error: 'Erro interno ao encerrar a partida. Tente novamente ou contate o suporte.' },
      500,
      headers,
    );
  }
});

async function tallyMatch(
  adminClient: SupabaseClient,
  matchId: string,
  gameTypeId: number,
): Promise<void> {
  // 1. Buscar os awards da modalidade da partida (junction award_game_types;
  //    !inner já filtra — um prêmio pode valer para várias modalidades)
  const { data: awards, error: awardsError } = await adminClient
    .from('awards')
    .select('*, award_game_types!inner(game_type_id)')
    .eq('award_game_types.game_type_id', gameTypeId);
  if (awardsError) throw awardsError;

  // 2. Buscar os jogadores e seus status na partida (gols e assistências)
  const { data: players, error: playersError } = await adminClient
    .from('match_players')
    .select('user_id, team, goals_scored, assists')
    .eq('match_id', matchId)
    .eq('status', 'confirmed')
    .not('user_id', 'is', null); // Apenas usuários registrados recebem awards
  if (playersError) throw playersError;

  // 3. Buscar todos os votos dessa partida
  const { data: votes, error: votesError } = await adminClient
    .from('match_votes')
    .select('award_id, voted_user_id, voter_user_id')
    .eq('match_id', matchId);
  if (votesError) throw votesError;

  const awardsToInsert: { match_id: string; user_id: string; award_id: number }[] = [];

  // --- AWARDS AUTOMÁTICOS (Goleador e Garçom) ---
  const goleadorAward = awards?.find((a) => a.name.toLowerCase().includes('goleador'));
  const garcomAward = awards?.find((a) =>
    a.name.toLowerCase().includes('garçom') || a.name.toLowerCase().includes('garcom')
  );

  if (players && players.length > 0) {
    // Goleador - empate = ninguém ganha
    if (goleadorAward) {
      const sortedByGoals = [...players].sort((a, b) =>
        (b.goals_scored || 0) - (a.goals_scored || 0)
      );
      const topGoals = sortedByGoals[0];
      if (topGoals && topGoals.goals_scored > 0) {
        const tiedCount = sortedByGoals.filter((p) =>
          p.goals_scored === topGoals.goals_scored
        ).length;
        if (tiedCount === 1) {
          awardsToInsert.push({
            match_id: matchId,
            user_id: topGoals.user_id,
            award_id: goleadorAward.id,
          });
        }
      }
    }
    // Garçom - empate = ninguém ganha
    if (garcomAward) {
      const sortedByAssists = [...players].sort((a, b) => (b.assists || 0) - (a.assists || 0));
      const topAssist = sortedByAssists[0];
      if (topAssist && topAssist.assists > 0) {
        const tiedCount = sortedByAssists.filter((p) => p.assists === topAssist.assists).length;
        if (tiedCount === 1) {
          awardsToInsert.push({
            match_id: matchId,
            user_id: topAssist.user_id,
            award_id: garcomAward.id,
          });
        }
      }
    }
  }

  // --- AWARDS POR VOTAÇÃO ---
  const votingAwards = awards?.filter((a) => a.is_voting_based) || [];

  for (const award of votingAwards) {
    const awardVotes = votes?.filter((v) => v.award_id === award.id) || [];
    const isCraque = award.name.toLowerCase().includes('craque');

    // Contar votos por usuário
    const voteCount: Record<string, number> = {};
    for (const vote of awardVotes) {
      if (vote.voted_user_id) {
        voteCount[vote.voted_user_id] = (voteCount[vote.voted_user_id] || 0) + 1;
      }
    }

    const sortedCandidates = Object.entries(voteCount).sort((a, b) => b[1] - a[1]);

    if (isCraque) {
      // CRAQUE: Empate = ninguém ganha. Zero votos = default (Goleador)
      if (sortedCandidates.length > 0) {
        const maxVotes = sortedCandidates[0][1];
        const winners = sortedCandidates.filter((c) => c[1] === maxVotes);

        if (winners.length === 1) {
          awardsToInsert.push({ match_id: matchId, user_id: winners[0][0], award_id: award.id });
        }
      } else {
        // Se todo mundo pulou (skip), o Goleador ganha o Craque por default
        const topScorer = [...(players || [])].sort((a, b) =>
          (b.goals_scored || 0) - (a.goals_scored || 0)
        )[0];
        if (topScorer) {
          awardsToInsert.push({
            match_id: matchId,
            user_id: topScorer.user_id,
            award_id: award.id,
          });
        }
      }
    } else {
      // OUTROS AWARDS: Vencedor precisa de 50%+ dos jogadores que votaram e sem empate no topo
      if (sortedCandidates.length > 0) {
        const uniqueVoters = new Set(awardVotes.map((v) => v.voter_user_id)).size;
        const [winnerId, winnerVotes] = sortedCandidates[0];
        const tiedCount = sortedCandidates.filter((c) => c[1] === winnerVotes).length;
        if (winnerVotes >= Math.ceil(uniqueVoters / 2) && tiedCount === 1) {
          awardsToInsert.push({ match_id: matchId, user_id: winnerId, award_id: award.id });
        }
      }
    }
  }

  // 4. Inserir os Awards no banco
  if (awardsToInsert.length > 0) {
    const { error: awardsInsertError } = await adminClient
      .from('match_awards')
      .upsert(awardsToInsert, { onConflict: 'match_id,user_id,award_id' });
    if (awardsInsertError) throw awardsInsertError;
  }

  // 5. ATUALIZAR O LEADERBOARD
  await updateLeaderboard(adminClient, matchId, players ?? [], votingAwards, awardsToInsert);
}

async function updateLeaderboard(
  adminClient: SupabaseClient,
  matchId: string,
  players: {
    user_id: string | null;
    team: string | null;
    goals_scored: number | null;
    assists: number | null;
  }[],
  votingAwards: { id: number; name: string }[],
  awardsToInsert: { match_id: string; user_id: string; award_id: number }[],
): Promise<void> {
  const { data: matchData, error: matchError } = await adminClient
    .from('matches')
    .select('group_id, date_time, team_a_score, team_b_score')
    .eq('id', matchId)
    .single();
  if (matchError) throw matchError;

  if (!matchData?.group_id) return;

  const { data: activeSeason, error: seasonError } = await adminClient
    .from('group_seasons')
    .select('id')
    .eq('group_id', matchData.group_id)
    .lte('start_date', matchData.date_time)
    .gte('end_date', matchData.date_time)
    .maybeSingle();
  if (seasonError) throw seasonError;

  if (!activeSeason) {
    console.warn(
      `Nenhuma temporada ativa para o grupo ${matchData.group_id} na data ${matchData.date_time} - leaderboard nao atualizado`,
    );
    return;
  }

  const scoreA = matchData.team_a_score || 0;
  const scoreB = matchData.team_b_score || 0;

  let resultA = { w: 0, d: 0, l: 0, pts: 0 };
  let resultB = { w: 0, d: 0, l: 0, pts: 0 };

  if (scoreA > scoreB) {
    resultA = { w: 1, d: 0, l: 0, pts: 3 };
  } else if (scoreB > scoreA) {
    resultB = { w: 1, d: 0, l: 0, pts: 3 };
  } else {
    resultA = { w: 0, d: 1, l: 0, pts: 1 };
    resultB = { w: 0, d: 1, l: 0, pts: 1 };
  }

  // Craque winners get +1 bonus point
  const craqueAwardIds = new Set(
    votingAwards.filter((a) => a.name.toLowerCase().includes('craque')).map(
      (a) => a.id,
    ),
  );
  const craqueWinners = new Set(
    awardsToInsert.filter((aw) => craqueAwardIds.has(aw.award_id)).map((aw) => aw.user_id),
  );

  const playerIds = players.map((p) => p.user_id).filter(Boolean) as string[];
  const { data: currentLeaderboard, error: leaderboardError } = await adminClient
    .from('season_leaderboards')
    .select('*')
    .eq('season_id', activeSeason.id)
    .in('user_id', playerIds);
  if (leaderboardError) throw leaderboardError;

  const currentMap = new Map((currentLeaderboard || []).map((l) => [l.user_id, l]));

  const leaderboardUpdates = players.flatMap((player) => {
    if (!player.user_id || !player.team) return [];
    const isTeamA = player.team === 'A';
    const matchResult = isTeamA ? resultA : resultB;
    const extraPoint = craqueWinners.has(player.user_id) ? 1 : 0;
    const cur = currentMap.get(player.user_id);

    return [{
      season_id: activeSeason.id,
      user_id: player.user_id,
      points: (cur?.points || 0) + matchResult.pts + extraPoint,
      matches_played: (cur?.matches_played || 0) + 1,
      wins: (cur?.wins || 0) + matchResult.w,
      draws: (cur?.draws || 0) + matchResult.d,
      losses: (cur?.losses || 0) + matchResult.l,
      updated_at: new Date().toISOString(),
    }];
  });

  if (leaderboardUpdates.length > 0) {
    const { error: upsertError } = await adminClient
      .from('season_leaderboards')
      .upsert(leaderboardUpdates, { onConflict: 'season_id,user_id' });
    if (upsertError) throw upsertError;
  }
}
