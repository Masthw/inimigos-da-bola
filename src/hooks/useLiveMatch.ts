import { useCallback, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Database } from "../lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";

export interface LivePlayer {
  userId: string;
  name: string;
  team: string;
  avatarUrl: string | null;
}

type SupabaseUpdatePromise = PromiseLike<{ error: PostgrestError | null }>;

export function useLiveMatch() {
  const [busy, setBusy] = useState(false);

  const addGoal = useCallback(
    async (
      matchId: string,
      scorerUserId: string,
      team: string,
      assistUserId?: string | null,
    ) => {
      setBusy(true);

      const [scorerRes, matchRes] = await Promise.all([
        supabase.from("match_players").select("id, goals_scored").eq(
          "match_id",
          matchId,
        ).eq("user_id", scorerUserId).maybeSingle(),
        supabase.from("matches").select("team_a_score, team_b_score").eq(
          "id",
          matchId,
        ).single(),
      ]);

      if (
        scorerRes.error || matchRes.error || !scorerRes.data || !matchRes.data
      ) {
        setBusy(false);
        return { error: "Erro ao buscar dados da partida" };
      }

      const currentGoals = scorerRes.data.goals_scored ?? 0;
      const updateScorer = supabase
        .from("match_players")
        .update({ goals_scored: currentGoals + 1 })
        .eq("id", scorerRes.data.id);

      const currentTeamScore = team === "A"
        ? (matchRes.data.team_a_score ?? 0)
        : (matchRes.data.team_b_score ?? 0);

      type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
      const scoreUpdatePayload: MatchUpdate = team === "A"
        ? { team_a_score: currentTeamScore + 1 }
        : { team_b_score: currentTeamScore + 1 };

      const updateScore = supabase.from("matches").update(scoreUpdatePayload)
        .eq("id", matchId);

      const updates: SupabaseUpdatePromise[] = [updateScorer, updateScore];

      if (assistUserId) {
        const assistRes = await supabase.from("match_players").select(
          "id, assists",
        ).eq("match_id", matchId).eq("user_id", assistUserId).maybeSingle();

        if (assistRes.data) {
          const currentAssists = assistRes.data.assists ?? 0;
          updates.push(
            supabase
              .from("match_players")
              .update({ assists: currentAssists + 1 })
              .eq("id", assistRes.data.id),
          );
        }
      }

      const results = await Promise.all(updates);
      setBusy(false);

      const errorResult = results.find((r) =>
        r.error
      );
      if (errorResult?.error) {
        console.error("Erro ao registrar gol:", errorResult.error);
        return { error: "Erro ao registrar gol" };
      }

      return { error: null };
    },
    [],
  );

  const addOwnGoal = useCallback(
    async (
      matchId: string,
      teamBenefited: string,
      scorerUserId: string | null,
    ) => {
      setBusy(true);

      const [matchRes, scorerRes] = await Promise.all([
        supabase.from("matches").select("team_a_score, team_b_score").eq(
          "id",
          matchId,
        ).single(),
        scorerUserId
          ? supabase.from("match_players").select("id, own_goals_scored").eq(
            "match_id",
            matchId,
          ).eq("user_id", scorerUserId).maybeSingle()
          : null,
      ]);

      if (matchRes.error || !matchRes.data) {
        setBusy(false);
        return { error: "Erro ao buscar placar" };
      }

      const currentScore = teamBenefited === "A"
        ? (matchRes.data.team_a_score ?? 0)
        : (matchRes.data.team_b_score ?? 0);

      type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
      const scoreUpdatePayload: MatchUpdate = teamBenefited === "A"
        ? { team_a_score: currentScore + 1 }
        : { team_b_score: currentScore + 1 };

      const updates: SupabaseUpdatePromise[] = [
        supabase.from("matches").update(scoreUpdatePayload).eq("id", matchId),
      ];

      if (scorerRes?.data) {
        const currentOwnGoals = scorerRes.data.own_goals_scored ?? 0;
        updates.push(
          supabase
            .from("match_players")
            .update({ own_goals_scored: currentOwnGoals + 1 })
            .eq("id", scorerRes.data.id),
        );
      }

      const results = await Promise.all(updates);
      setBusy(false);

      const errorResult = results.find((r) => r.error);
      if (errorResult?.error) {
        console.error("Erro ao registrar gol contra:", errorResult.error);
        return { error: "Erro ao registrar gol contra" };
      }

      return { error: null };
    },
    [],
  );

  const finishMatch = useCallback(
    async (matchId: string, teamAScore: number, teamBScore: number) => {
      setBusy(true);

      const { error } = await supabase
        .from("matches")
        .update({
          status: "finished",
          team_a_score: teamAScore,
          team_b_score: teamBScore,
        })
        .eq("id", matchId);

      setBusy(false);

      if (error) {
        console.error("Erro ao finalizar partida:", error);
        return { error: "Erro ao finalizar partida" };
      }

      return { error: null };
    },
    [],
  );

  const startMatch = useCallback(async (matchId: string) => {
    setBusy(true);

    const { error } = await supabase.from("matches").update({
      status: "in_progress",
      team_a_score: 0,
      team_b_score: 0,
    }).eq("id", matchId);

    setBusy(false);

    if (error) {
      console.error("Erro ao iniciar partida:", error);
      return { error: "Erro ao iniciar partida" };
    }

    return { error: null };
  }, []);

  return { busy, addGoal, addOwnGoal, finishMatch, startMatch };
}
