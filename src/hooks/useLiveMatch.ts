import { useCallback, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Database } from "../lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";
import { validateMatchGroup } from "../lib/groupGuard";
import { performClientSideDraw } from "../lib/teamDrawer";

export interface LivePlayer {
  userId: string;
  name: string;
  team: string;
  avatarUrl: string | null;
}

type SupabaseUpdatePromise = PromiseLike<{ error: PostgrestError | null }>;

export function useLiveMatch(groupId: string | null = null) {
  const [busy, setBusy] = useState(false);

  const addGoal = useCallback(
    async (
      matchId: string,
      scorerId: string,
      team: string,
      assistId?: string | null,
    ) => {
      setBusy(true);
      try {
        const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
        if (!valid) {
          return { error: guardError ?? "Validação de grupo falhou" };
        }

        const [scorerRes, matchRes] = await Promise.all([
          supabase.from("match_players").select("id, goals_scored").eq(
            "match_id",
            matchId,
          ).eq("id", scorerId).maybeSingle(),
          supabase.from("matches").select("team_a_score, team_b_score").eq(
            "id",
            matchId,
          ).single(),
        ]);

        if (
          scorerRes.error || matchRes.error || !scorerRes.data || !matchRes.data
        ) {
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

        if (assistId) {
          const assistRes = await supabase.from("match_players").select(
            "id, assists",
          ).eq("match_id", matchId).eq("id", assistId).maybeSingle();

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

        const errorResult = results.find((r) =>
          r.error
        );
        if (errorResult?.error) {
          console.error("Erro ao registrar gol:", errorResult.error);
          return { error: "Erro ao registrar gol" };
        }

        return { error: null };
      } finally {
        setBusy(false);
      }
    },
    [groupId],
  );

  const addOwnGoal = useCallback(
    async (
      matchId: string,
      teamBenefited: string,
      scorerId: string | null,
    ) => {
      setBusy(true);
      try {
        const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
        if (!valid) {
          return { error: guardError ?? "Validação de grupo falhou" };
        }

        const [matchRes, scorerRes] = await Promise.all([
          supabase.from("matches").select("team_a_score, team_b_score").eq(
            "id",
            matchId,
          ).single(),
          scorerId
            ? supabase.from("match_players").select("id, own_goals_scored").eq(
              "match_id",
              matchId,
            ).eq("id", scorerId).maybeSingle()
            : null,
        ]);

        if (matchRes.error || !matchRes.data) {
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

        const errorResult = results.find((r) => r.error);
        if (errorResult?.error) {
          console.error("Erro ao registrar gol contra:", errorResult.error);
          return { error: "Erro ao registrar gol contra" };
        }

        return { error: null };
      } finally {
        setBusy(false);
      }
    },
    [groupId],
  );


  const startMatch = useCallback(async (matchId: string) => {
    setBusy(true);
    try {
      const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
      if (!valid) {
        return { error: guardError ?? "Validação de grupo falhou" };
      }

      try {
        const res = await supabase.functions.invoke("generate-lineup", {
          body: { matchId, groupId },
        });
        if (res.error) throw res.error;
      } catch (drawErr) {
        console.warn(
          "Aviso: sorteio via edge function falhou, executando sorteio direto:",
          drawErr,
        );
        await performClientSideDraw(matchId);
      }

      const { error } = await supabase.from("matches").update({
        status: "preparing",
        team_a_score: 0,
        team_b_score: 0,
      }).eq("id", matchId);

      if (error) {
        console.error("Erro ao iniciar partida:", error);
        return { error: "Erro ao iniciar partida" };
      }

      return { error: null };
    } finally {
      setBusy(false);
    }
  }, [groupId]);

  const startLive = useCallback(async (matchId: string) => {
    setBusy(true);
    try {
      const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
      if (!valid) {
        return { error: guardError ?? "Validação de grupo falhou" };
      }

      const { error } = await supabase.from("matches").update({
        status: "in_progress",
      }).eq("id", matchId);

      if (error) {
        console.error("Erro ao iniciar jogo ao vivo:", error);
        return { error: "Erro ao iniciar jogo ao vivo" };
      }

      return { error: null };
    } finally {
      setBusy(false);
    }
  }, [groupId]);

  const setTacticalPosition = useCallback(
    async (matchPlayerId: string, position: string | null) => {
      setBusy(true);
      try {
        const { error } = await supabase
          .from("match_players")
          .update({ tactical_position: position })
          .eq("id", matchPlayerId);

        if (error) {
          console.error("Erro ao salvar posição tática:", error);
          return { error: "Erro ao salvar posição" };
        }
        return { error: null };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { busy, addGoal, addOwnGoal, startMatch, startLive, setTacticalPosition };
}
