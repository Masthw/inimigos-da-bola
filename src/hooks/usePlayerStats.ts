import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export interface PlayerStats {
  goals: number;
  assists: number;
  matchesPlayed: number;
  wins: number;
  winRate: number | null;
}

const EMPTY_STATS: PlayerStats = {
  goals: 0,
  assists: 0,
  matchesPlayed: 0,
  wins: 0,
  winRate: null,
};

export function usePlayerStats(userId: string | null) {
  const [stats, setStats] = useState<PlayerStats>(EMPTY_STATS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const id = userId;

    async function load() {
      setLoaded(false);

      const { data } = await supabase
        .from("match_players")
        .select(
          "goals_scored, assists, team, matches!inner(status, team_a_score, team_b_score)",
        )
        .eq("user_id", id);

      if (cancelled) return;

      const rows = data ?? [];
      const finished = rows.filter((row) => row.matches.status === "finished");

      const goals = rows.reduce((acc, row) => acc + (row.goals_scored ?? 0), 0);
      const assists = rows.reduce((acc, row) => acc + (row.assists ?? 0), 0);

      const wins = finished.filter((row) => {
        const match = row.matches;
        if (match.team_a_score === null || match.team_b_score === null) {
          return false;
        }
        if (match.team_a_score === match.team_b_score) return false;

        const teamAWon = match.team_a_score > match.team_b_score;

        if (row.team === "A") {
          return teamAWon;
        }
        if (row.team === "B") {
          return !teamAWon;
        }

        return false;
      }).length;

      const winRate = finished.length > 0
        ? Math.round((wins / finished.length) * 100)
        : null;

      setStats({
        goals,
        assists,
        matchesPlayed: finished.length,
        wins,
        winRate,
      });
      setLoaded(true);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { stats, loading: userId !== null && !loaded };
}
