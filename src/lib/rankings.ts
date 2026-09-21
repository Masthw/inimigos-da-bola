import { supabase } from "./supabaseClient";

export interface PlayerRank {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  badges: string[];
  isCurrentUser: boolean;
}

interface PlayerStats {
  goals: number;
  assists: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
}

const EMPTY_STATS: PlayerStats = {
  goals: 0,
  assists: 0,
  matchesPlayed: 0,
  wins: 0,
  draws: 0,
  losses: 0,
};

function applyMatchResult(
  stats: PlayerStats,
  team: string,
  match: { team_a_score: number | null; team_b_score: number | null },
) {
  if (match.team_a_score === null || match.team_b_score === null) return;
  if (match.team_a_score === match.team_b_score) {
    stats.draws += 1;
    return;
  }
  const teamAWon = match.team_a_score > match.team_b_score;
  const playerWon = (team === "A" && teamAWon) || (team === "B" && !teamAWon);
  if (playerWon) stats.wins += 1;
  else stats.losses += 1;
}

function buildStatsMap(
  matchPlayers: Array<{
    user_id: string | null;
    goals_scored: number | null;
    assists: number | null;
    team: string;
    matches: { team_a_score: number | null; team_b_score: number | null } | null;
  }> | null,
): Map<string, PlayerStats> {
  const statsMap = new Map<string, PlayerStats>();
  for (const row of matchPlayers ?? []) {
    if (!row.user_id) continue;
    const current = statsMap.get(row.user_id) ?? { ...EMPTY_STATS };
    current.goals += row.goals_scored ?? 0;
    current.assists += row.assists ?? 0;
    current.matchesPlayed += 1;
    if (row.matches) applyMatchResult(current, row.team, row.matches);
    statsMap.set(row.user_id, current);
  }
  return statsMap;
}

function buildBadgesMap(
  awards: Array<{ user_id: string | null; awards: { name: string | null } | null }> | null,
): Map<string, string[]> {
  const badgesMap = new Map<string, string[]>();
  for (const row of awards ?? []) {
    const name = row.awards?.name;
    if (!name || !row.user_id) continue;
    const list = badgesMap.get(row.user_id) ?? [];
    list.push(name);
    badgesMap.set(row.user_id, list);
  }
  return badgesMap;
}

type LeaderboardRow = {
  user_id: string;
  points?: number | null;
  matches_played?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
};

function buildLeaderboardMaps(leaderboard: LeaderboardRow[] | null) {
  const pointsMap = new Map<string, number>();
  const matchesPlayedMap = new Map<string, number>();
  const winsMap = new Map<string, number>();
  const drawsMap = new Map<string, number>();
  const lossesMap = new Map<string, number>();
  for (const row of leaderboard ?? []) {
    pointsMap.set(row.user_id, row.points ?? 0);
    matchesPlayedMap.set(row.user_id, row.matches_played ?? 0);
    winsMap.set(row.user_id, row.wins ?? 0);
    drawsMap.set(row.user_id, row.draws ?? 0);
    lossesMap.set(row.user_id, row.losses ?? 0);
  }
  return { pointsMap, matchesPlayedMap, winsMap, drawsMap, lossesMap };
}

// Ordenação única usada por Tabela, Perfil e widget da Home. O nome entra como
// desempate determinístico (ordem alfabética), evitando posições "aleatórias"
// quando os pontos estão empatados (ex.: todos com 0).
export function compareLeaderboard(a: PlayerRank, b: PlayerRank): number {
  return (
    b.points - a.points ||
    b.goals - a.goals ||
    b.assists - a.assists ||
    b.wins - a.wins ||
    a.name.localeCompare(b.name) ||
    a.id.localeCompare(b.id)
  );
}

export interface LeaderboardData {
  entries: PlayerRank[];
  seasonExists: boolean;
  hasPlayedMatches: boolean;
  hasLeaderboardPoints: boolean;
}

export async function fetchRankingData(
  groupId: string | null | undefined,
  currentUserId?: string,
): Promise<LeaderboardData> {
  if (!groupId) {
    return { entries: [], seasonExists: false, hasPlayedMatches: false, hasLeaderboardPoints: false };
  }

  const [{ data: season }, { data: members }] = await Promise.all([
    supabase
      .from("group_seasons")
      .select("id")
      .eq("group_id", groupId)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("status", "approved"),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id);
  if (memberIds.length === 0) {
    return { entries: [], seasonExists: season != null, hasPlayedMatches: false, hasLeaderboardPoints: false };
  }

  const [{ data: leaderboard }, { data: matchPlayers }, { data: awards }] = await Promise.all([
    season
      ? supabase
          .from("season_leaderboards")
          .select("*")
          .eq("season_id", season.id)
          .in("user_id", memberIds)
      : Promise.resolve({ data: [] as LeaderboardRow[] }),
    supabase
      .from("match_players")
      .select("user_id, team, goals_scored, assists, matches!inner(status, team_a_score, team_b_score, date_time, group_id)")
      .eq("status", "confirmed")
      .eq("matches.status", "finished")
      .is("matches.deleted_at", null)
      .eq("matches.group_id", groupId)
      .in("user_id", memberIds),
    supabase
      .from("match_awards")
      .select("user_id, awards(name)")
      .in("user_id", memberIds),
  ]);

  const statsMap = buildStatsMap(matchPlayers as Parameters<typeof buildStatsMap>[0]);
  const badgesMap = buildBadgesMap(awards as Parameters<typeof buildBadgesMap>[0]);
  const { pointsMap, matchesPlayedMap, winsMap, drawsMap, lossesMap } = buildLeaderboardMaps(
    leaderboard as LeaderboardRow[] | null,
  );

  const allUserIds = new Set([
    ...memberIds,
    ...Array.from(pointsMap.keys()),
    ...Array.from(statsMap.keys()),
  ]);

  const { data: users } = allUserIds.size > 0
    ? await supabase
        .from("users")
        .select("id, name, avatar_url")
        .in("id", Array.from(allUserIds))
        .is("deleted_at", null)
    : { data: [] as { id: string; name: string | null; avatar_url: string | null }[] };

  const entries: PlayerRank[] = [];
  for (const u of users ?? []) {
    const stats = statsMap.get(u.id) ?? EMPTY_STATS;
    const craqueCount = (badgesMap.get(u.id) ?? []).filter((b) => b.toLowerCase().includes("craque")).length;
    const computedPoints = stats.wins * 3 + stats.draws * 1 + craqueCount;
    const lbPoints = pointsMap.get(u.id);
    const points = lbPoints != null && lbPoints > 0 ? lbPoints : computedPoints;
    entries.push({
      id: u.id,
      name: u.name ?? "Jogador",
      avatarUrl: u.avatar_url,
      points,
      matchesPlayed: matchesPlayedMap.get(u.id) ?? stats.matchesPlayed,
      wins: winsMap.get(u.id) ?? stats.wins,
      draws: drawsMap.get(u.id) ?? stats.draws,
      losses: lossesMap.get(u.id) ?? stats.losses,
      goals: stats.goals,
      assists: stats.assists,
      badges: Array.from(new Set(badgesMap.get(u.id) ?? [])),
      isCurrentUser: u.id === currentUserId,
    });
  }

  entries.sort(compareLeaderboard);

  return {
    entries,
    seasonExists: season != null,
    hasPlayedMatches: (matchPlayers ?? []).length > 0,
    hasLeaderboardPoints: pointsMap.size > 0,
  };
}