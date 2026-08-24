import { SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders, FunctionError, jsonResponse, requireAdmin } from '../_shared/auth.ts';

// 1. TIPAGENS

interface PlayerData {
  userId: string;
  name: string;
  position: string;
  points: number;
  isGoalkeeper: boolean;
}

interface MatchPlayerRow {
  user_id: string;
  team: string;
  goals_scored: number;
  assists: number;
  users: { name: string } | { name: string }[] | null;
}

interface FavPositionRow {
  user_id: string;
  position_id: number;
  is_primary: boolean;
  positions: { code: string; name: string } | { code: string; name: string }[] | null;
}

interface LeaderboardRow {
  user_id: string;
  points: number;
}

// 2. HELPERS

function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 3. BUSCA DE DADOS

async function getDraftData(adminClient: SupabaseClient, matchId: string): Promise<PlayerData[]> {
  const { data: matchPlayers, error: playersError } = await adminClient
    .from('match_players')
    .select('user_id, team, goals_scored, assists, users(name)')
    .eq('match_id', matchId)
    .eq('status', 'confirmed')
    .not('user_id', 'is', null)
    .overrideTypes<MatchPlayerRow[]>();

  if (playersError) throw playersError;
  if (!matchPlayers || matchPlayers.length === 0) {
    throw new FunctionError(400, 'Nenhum jogador confirmado');
  }

  const userIds = matchPlayers.map((p) => p.user_id);

  const { data: favPositions, error: favError } = await adminClient
    .from('user_favorite_positions')
    .select('user_id, position_id, is_primary, positions(code, name)')
    .in('user_id', userIds)
    .overrideTypes<FavPositionRow[]>();

  if (favError) throw favError;

  const { data: matchData, error: matchError } = await adminClient
    .from('matches')
    .select('group_id, date_time')
    .eq('id', matchId)
    .single();

  if (matchError) throw matchError;

  let rankMap = new Map<string, number>();

  if (matchData?.group_id) {
    const { data: activeSeason, error: seasonError } = await adminClient
      .from('group_seasons')
      .select('id')
      .eq('group_id', matchData.group_id)
      .lte('start_date', matchData.date_time)
      .gte('end_date', matchData.date_time)
      .maybeSingle();

    if (seasonError) throw seasonError;

    if (activeSeason) {
      const { data: leaderboard, error: leaderboardError } = await adminClient
        .from('season_leaderboards')
        .select('user_id, points')
        .eq('season_id', activeSeason.id)
        .in('user_id', userIds)
        .overrideTypes<LeaderboardRow[]>();

      if (leaderboardError) throw leaderboardError;

      rankMap = new Map((leaderboard || []).map((l) => [l.user_id, l.points || 0]));
    }
  }

  return matchPlayers.map((p) => {
    const fav = favPositions?.find((fp) => fp.user_id === p.user_id);

    const favPosition = Array.isArray(fav?.positions) ? fav?.positions[0] : fav?.positions;
    const positionName = favPosition?.code || 'MF';

    const rawUser = Array.isArray(p.users) ? p.users[0] : p.users;
    const points = rankMap.get(p.user_id) || 0;

    return {
      userId: p.user_id,
      name: rawUser?.name || 'Jogador',
      position: positionName,
      points,
      isGoalkeeper: positionName === 'GK',
    };
  });
}

// 4. LÓGICA DE SORTEIO

function distributeTeams(players: PlayerData[]) {
  const goalkeepers = players.filter((p) => p.isGoalkeeper);
  const fieldPlayers = players.filter((p) => !p.isGoalkeeper);

  const shuffledGK = shuffleArray(goalkeepers);
  const teamA: PlayerData[] = [];
  const teamB: PlayerData[] = [];

  if (shuffledGK.length >= 2) {
    teamA.push(shuffledGK[0]);
    teamB.push(shuffledGK[1]);
  } else if (shuffledGK.length === 1) {
    teamA.push(shuffledGK[0]);
  }

  fieldPlayers.sort((a, b) => b.points - a.points);

  for (let i = 0; i < fieldPlayers.length; i++) {
    if (i % 4 === 0 || i % 4 === 3) {
      teamA.push(fieldPlayers[i]);
    } else {
      teamB.push(fieldPlayers[i]);
    }
  }

  const subs: PlayerData[] = [];
  while (teamA.length > 5) {
    subs.push(teamA.pop()!);
  }
  while (teamB.length > 5) {
    subs.push(teamB.pop()!);
  }

  return { teamA, teamB, subs, totalPlayers: players.length };
}

// 5. FUNÇÃO PRINCIPAL

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const { adminClient } = await requireAdmin(req);
    const { matchId } = await req.json().catch(() => ({}));

    if (!matchId) {
      throw new FunctionError(400, 'matchId é obrigatório');
    }

    const players = await getDraftData(adminClient, matchId);
    const draftResult = distributeTeams(players);

    const formatTeam = (team: PlayerData[]) =>
      team.map((p) => ({
        userId: p.userId,
        name: p.name,
        position: p.position,
        points: p.points,
      }));

    return jsonResponse(
      {
        teamA: formatTeam(draftResult.teamA),
        teamB: formatTeam(draftResult.teamB),
        subs: formatTeam(draftResult.subs),
        totalPlayers: draftResult.totalPlayers,
      },
      200,
      headers,
    );
  } catch (error) {
    if (error instanceof FunctionError) {
      return jsonResponse({ error: error.message }, error.status, headers);
    }
    console.error('generate-lineup:', error);
    return jsonResponse(
      { error: 'Erro interno ao sortear os times. Tente novamente.' },
      500,
      headers,
    );
  }
});
