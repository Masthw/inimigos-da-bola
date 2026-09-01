import { SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders, FunctionError, jsonResponse, requireAdmin } from '../_shared/auth.ts';

// 1. TIPAGENS

interface PlayerData {
  userId: string;
  name: string;
  position: string;
  points: number;
  isGoalkeeper: boolean;
  matchPlayerId: string;
  guestName: string | null;
}

interface MatchPlayerRow {
  id: string;
  user_id: string | null;
  team: string | null;
  goals_scored: number;
  assists: number;
  users: { name: string } | { name: string }[] | null;
  guest_name: string | null;
}

interface FavPositionRow {
  user_id: string;
  position_id: number;
  is_primary: boolean;
  positions: { code: string; name: string; game_type_id: number } | { code: string; name: string; game_type_id: number }[] | null;
}

interface LeaderboardRow {
  user_id: string;
  points: number;
}

interface GameTypeRow {
  id: number;
  default_max_players: number;
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

async function getGameType(adminClient: SupabaseClient, matchId: string): Promise<GameTypeRow> {
  const { data: matchData, error: matchError } = await adminClient
    .from('matches')
    .select('game_type_id')
    .eq('id', matchId)
    .single();

  if (matchError) throw matchError;

  const { data: gameType, error: gameTypeError } = await adminClient
    .from('game_types')
    .select('id, default_max_players')
    .eq('id', (matchData as { game_type_id: number }).game_type_id)
    .single();

  if (gameTypeError) throw gameTypeError;

  return gameType as GameTypeRow;
}

async function getValidPositionIds(adminClient: SupabaseClient, gameTypeId: number): Promise<Set<number>> {
  const { data: positions, error } = await adminClient
    .from('positions')
    .select('id')
    .eq('game_type_id', gameTypeId);

  if (error) throw error;

  return new Set((positions ?? []).map((p) => p.id));
}

async function getDraftData(adminClient: SupabaseClient, matchId: string): Promise<{ players: PlayerData[]; teamSize: number }> {
  const { data: matchPlayers, error: playersError } = await adminClient
    .from('match_players')
    .select('id, user_id, team, goals_scored, assists, users(name), guest_name')
    .eq('match_id', matchId)
    .eq('status', 'confirmed')
    .overrideTypes<MatchPlayerRow[]>();

  if (playersError) throw playersError;
  if (!matchPlayers || matchPlayers.length === 0) {
    throw new FunctionError(400, 'Nenhum jogador confirmado');
  }

  const userIds = matchPlayers.map((p) => p.user_id).filter((id): id is string => id !== null);

  const { data: favPositions, error: favError } = await adminClient
    .from('user_favorite_positions')
    .select('user_id, position_id, is_primary, positions(code, name, game_type_id)')
    .in('user_id', userIds)
    .overrideTypes<FavPositionRow[]>();

  if (favError) throw favError;

  const { data: matchData, error: matchError } = await adminClient
    .from('matches')
    .select('group_id, date_time, game_type_id')
    .eq('id', matchId)
    .single();

  if (matchError) throw matchError;

  const gameType = await getGameType(adminClient, matchId);
  const validPositionIds = await getValidPositionIds(adminClient, gameType.id);
  const teamSize = Math.max(1, Math.floor((gameType.default_max_players || 5) / 2));

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

  const players = matchPlayers.map((p) => {
    const userFavs = (favPositions ?? []).filter((fp) => fp.user_id === p.user_id);
    const primaryFav = userFavs.find((fp) => fp.is_primary);
    const fallbackFav = userFavs[0];
    const fav = primaryFav ?? fallbackFav;

    const favPosition = Array.isArray(fav?.positions) ? fav?.positions[0] : fav?.positions;
    const positionCode = favPosition?.code && fav && validPositionIds.has(fav.position_id)
      ? favPosition.code
      : 'MF';

    const points = rankMap.get(p.user_id || '') || 0;

    return {
      userId: p.user_id ?? '',
      name: (Array.isArray(p.users) ? p.users[0]?.name : p.users?.name) ?? p.guest_name ?? 'Convidado',
      position: positionCode,
      points,
      isGoalkeeper: false,
      matchPlayerId: p.id,
      guestName: p.guest_name ?? null,
    };
  });

  return { players, teamSize };
}

// 4. LÓGICA DE SORTEIO

interface DraftResult {
  teamA: PlayerData[];
  teamB: PlayerData[];
  subs: PlayerData[];
  totalPlayers: number;
}

function distributeTeams(players: PlayerData[], teamSize: number): DraftResult {
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

  const maxTeam = Math.max(teamSize, 1);
  const subs: PlayerData[] = [];

  while (teamA.length > maxTeam) {
    subs.push(teamA.pop()!);
  }
  while (teamB.length > maxTeam) {
    subs.push(teamB.pop()!);
  }

  const diff = teamA.length - teamB.length;
  if (diff > 1 && subs.length >= diff) {
    for (let i = 0; i < diff - 1; i++) {
      const moved = teamA.pop()!;
      subs.push(moved);
      teamB.push(moved);
    }
  } else if (diff < -1 && subs.length >= -diff) {
    for (let i = 0; i < -diff - 1; i++) {
      const moved = teamB.pop()!;
      subs.push(moved);
      teamA.push(moved);
    }
  }

  return { teamA, teamB, subs, totalPlayers: players.length };
}

// 5. PERSISTÊNCIA

async function persistDraft(adminClient: SupabaseClient, matchId: string, draft: DraftResult): Promise<void> {
  const updates = [
    ...draft.teamA.map((p) =>
      adminClient
        .from('match_players')
        .update({ team: 'A' })
        .eq('id', p.matchPlayerId),
    ),
    ...draft.teamB.map((p) =>
      adminClient
        .from('match_players')
        .update({ team: 'B' })
        .eq('id', p.matchPlayerId),
    ),
    ...draft.subs.map((p) =>
      adminClient
        .from('match_players')
        .update({ team: null })
        .eq('id', p.matchPlayerId),
    ),
  ];

  const results = await Promise.all(updates);

  for (const res of results) {
    if (res.error) {
      console.error('Erro ao atualizar time do jogador:', res.error);
    }
  }
}

// 6. FUNÇÃO PRINCIPAL

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
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

    const { players, teamSize } = await getDraftData(adminClient, matchId);
    const draftResult = distributeTeams(players, teamSize);

    await persistDraft(adminClient, matchId, draftResult);

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
        teamSize,
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
