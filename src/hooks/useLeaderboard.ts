import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getFirstName } from "../lib/profile";
import { useAuth } from "./useAuth";
import { useActiveGroup } from "./useActiveGroup";

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  isCurrentUser: boolean;
}

export function useLeaderboard(groupId: string | null = null) {
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonStarted, setSeasonStarted] = useState(false);

  const effectiveGroupId = groupId ?? activeGroup?.id ?? null;

  useEffect(() => {
    if (!user || !effectiveGroupId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries([]);
      setSeasonStarted(false);
      setLoading(false);
      return;
    }
    const currentUserId = user.id;
    const groupIdString: string = effectiveGroupId;

    let cancelled = false;

    // Clear stale data immediately when group changes
    setEntries([]);
    setSeasonStarted(false);
    setLoading(true);

    async function load() {
      const { data: season } = await supabase
        .from("group_seasons")
        .select("id")
        .eq("group_id", groupIdString)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupIdString)
        .eq("status", "approved");

      if (cancelled) return;

      const memberIds = (members ?? []).map((m) => m.user_id);

      if (memberIds.length === 0) {
        setEntries([]);
        setSeasonStarted(false);
        setLoading(false);
        return;
      }

      const [{ data: leaderboard }, { data: matchPlayers }, { data: awards }, { data: users }] = await Promise.all([
        season
          ? supabase
              .from("season_leaderboards")
              .select("user_id, points")
              .eq("season_id", season.id)
              .in("user_id", memberIds)
          : Promise.resolve({ data: [] as { user_id: string; points: number | null }[] }),
        supabase
          .from("match_players")
          .select("user_id, team, goals_scored, assists, matches!inner(status, team_a_score, team_b_score, group_id)")
          .eq("matches.status", "finished")
          .is("matches.deleted_at", null)
          .eq("matches.group_id", groupIdString)
          .in("user_id", memberIds),
        supabase
          .from("match_awards")
          .select("user_id, awards(name)")
          .in("user_id", memberIds),
        supabase
          .from("users")
          .select("id, name, avatar_url")
          .in("id", memberIds)
          .is("deleted_at", null),
      ]);

      if (cancelled) return;

      const pointsFromLeaderboard = new Map(
        (leaderboard ?? []).map((entry) => [entry.user_id, entry.points ?? 0]),
      );

      // Calcular pontos a partir das partidas se season_leaderboards não tiver dados
      const matchPointsMap = new Map<string, number>();
      for (const row of matchPlayers ?? []) {
        if (!row.user_id || !row.matches) continue;
        const curPts = matchPointsMap.get(row.user_id) ?? 0;
        const homeScore = row.matches.team_a_score ?? 0;
        const awayScore = row.matches.team_b_score ?? 0;
        let matchPts: number;
        if (homeScore === awayScore) {
          matchPts = 1;
        } else {
          const teamAWon = homeScore > awayScore;
          const won = (row.team === "A" && teamAWon) || (row.team === "B" && !teamAWon);
          matchPts = won ? 3 : 0;
        }
        matchPointsMap.set(row.user_id, curPts + matchPts);
      }

      for (const award of awards ?? []) {
        if (!award.user_id || !award.awards?.name) continue;
        if (award.awards.name.toLowerCase().includes("craque")) {
          matchPointsMap.set(award.user_id, (matchPointsMap.get(award.user_id) ?? 0) + 1);
        }
      }

      const hasPlayedMatches = (matchPlayers ?? []).length > 0;
      const hasLeaderboardPoints = pointsFromLeaderboard.size > 0;

      const formattedEntries = (users ?? [])
        .map((row) => {
          const lbPoints = pointsFromLeaderboard.get(row.id);
          const computedPoints = matchPointsMap.get(row.id) ?? 0;
          const finalPoints = lbPoints != null && lbPoints > 0 ? lbPoints : computedPoints;
          return {
            id: row.id,
            name: getFirstName(row.name ?? "Jogador"),
            avatarUrl: row.avatar_url,
            points: finalPoints,
            isCurrentUser: row.id === currentUserId,
          };
        })
        .toSorted((a, b) => b.points - a.points);

      setEntries(formattedEntries);
      setSeasonStarted(hasPlayedMatches || hasLeaderboardPoints || season != null);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, effectiveGroupId]);

  return { entries, loading, seasonStarted };
}
