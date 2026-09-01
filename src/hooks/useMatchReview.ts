import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Database } from "../lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";
import { validateMatchGroup } from "../lib/groupGuard";

export interface MatchGoal {
  id: string;
  playerId: string;
  playerName: string;
  team: "A" | "B";
  minute?: number;
}

export interface MatchAssist {
  id: string;
  assistPlayerId: string;
  assistPlayerName: string;
  goalId: string;
  scorerName: string;
}

export interface OwnGoal {
  id: string;
  playerId: string;
  playerName: string;
  team: "A" | "B";
}

export interface MatchReviewData {
  id: string;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamAScore: number;
  teamBScore: number;
  organizerId: string;
  goals: MatchGoal[];
  assists: MatchAssist[];
  ownGoals: OwnGoal[];
  players: { userId: string; name: string; team: "A" | "B"; avatarUrl: string | null }[];
}

type SupabaseUpdatePromise = PromiseLike<{ error: PostgrestError | null }>;

export function useMatchReview(matchId: string | undefined, groupId: string | null = null) {
  const [match, setMatch] = useState<MatchReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviewData = useCallback(async () => {
    if (!matchId) return;

    const [matchRes, playersRes] = await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, team_a_name, team_b_name, team_a_color, team_b_color, team_a_score, team_b_score, status, organizer_id",
        )
        .eq("id", matchId)
        .single(),
      supabase
        .from("match_players")
        .select(
          "user_id, guest_name, team, goals_scored, assists, own_goals_scored, users(name)",
        )
        .eq("match_id", matchId)
        .eq("status", "confirmed"),
    ]);

    if (matchRes.error || !matchRes.data) {
      setError("Partida não encontrada");
      setLoading(false);
      return;
    }

    if (matchRes.data.status !== "in_progress") {
      setError("Partida não está em andamento");
      setLoading(false);
      return;
    }

    const players = (playersRes.data ?? []).map((row) => ({
      userId: row.user_id ?? `guest-${row.guest_name}`,
      name: row.users?.name ?? row.guest_name ?? "Convidado",
      team: row.team as "A" | "B",
      avatarUrl: null,
    }));

    const goals: MatchGoal[] = [];
    const assists: MatchAssist[] = [];
    const ownGoals: OwnGoal[] = [];

    for (const row of playersRes.data ?? []) {
      const playerName = row.users?.name ?? row.guest_name ?? "Convidado";
      const playerId = row.user_id ?? `guest-${row.guest_name}`;
      const goalsCount = row.goals_scored ?? 0;
      const assistsCount = row.assists ?? 0;
      const ownGoalsCount = row.own_goals_scored ?? 0;

      for (let i = 0; i < goalsCount; i++) {
        goals.push({
          id: `${playerId}-goal-${i}`,
          playerId,
          playerName,
          team: row.team as "A" | "B",
        });
      }

      for (let i = 0; i < assistsCount; i++) {
        assists.push({
          id: `${playerId}-assist-${i}`,
          assistPlayerId: playerId,
          assistPlayerName: playerName,
          goalId: "",
          scorerName: "",
        });
      }

      for (let i = 0; i < ownGoalsCount; i++) {
        ownGoals.push({
          id: `${playerId}-own-goal-${i}`,
          playerId,
          playerName,
          team: row.team as "A" | "B",
        });
      }
    }

    setMatch({
      id: matchRes.data.id,
      teamAName: matchRes.data.team_a_name ?? "Time A",
      teamBName: matchRes.data.team_b_name ?? "Time B",
      teamAColor: matchRes.data.team_a_color ?? "#ef4444",
      teamBColor: matchRes.data.team_b_color ?? "#3b82f6",
      teamAScore: matchRes.data.team_a_score ?? 0,
      teamBScore: matchRes.data.team_b_score ?? 0,
      organizerId: matchRes.data.organizer_id,
      goals,
      assists,
      ownGoals,
      players,
    });
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (isMounted) {
        await fetchReviewData();
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fetchReviewData]);

  const updateScore = useCallback(async (teamA: number, teamB: number) => {
    if (!matchId) return;
    setSaving(true);
    try {
      const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
      if (!valid) {
        setError(guardError ?? "Validação de grupo falhou");
        return false;
      }

      const { error } = await supabase
        .from("matches")
        .update({ team_a_score: teamA, team_b_score: teamB })
        .eq("id", matchId);
      if (error) {
        setError("Erro ao atualizar placar");
        return false;
      }
      setMatch((prev) =>
        prev ? { ...prev, teamAScore: teamA, teamBScore: teamB } : null
      );
      return true;
    } finally {
      setSaving(false);
    }
  }, [matchId, groupId]);

  const startVoting = useCallback(async () => {
    if (!matchId) return;
    setSaving(true);
    try {
      const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
      if (!valid) {
        setError(guardError ?? "Validação de grupo falhou");
        return false;
      }

      const votingEndsAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
        .toISOString();
      const { error } = await supabase
        .from("matches")
        .update({
          status: "voting",
          voting_ends_at: votingEndsAt,
        })
        .eq("id", matchId);
      if (error) {
        setError("Erro ao iniciar votação");
        return false;
      }
      return true;
    } finally {
      setSaving(false);
    }
  }, [matchId, groupId]);

  const addGoal = useCallback(
    async (
      scorerUserId: string,
      team: string,
      assistUserId?: string | null,
    ) => {
      if (!matchId) return false;
      setSaving(true);
      try {
        const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
        if (!valid) {
          setError(guardError ?? "Validação de grupo falhou");
          return false;
        }

        const [scorerRes, matchRes] = await Promise.all([
          supabase
            .from("match_players")
            .select("id, goals_scored")
            .eq("match_id", matchId)
            .eq("user_id", scorerUserId)
            .maybeSingle(),
          supabase
            .from("matches")
            .select("team_a_score, team_b_score")
            .eq("id", matchId)
            .single(),
        ]);

        if (
          scorerRes.error || matchRes.error || !scorerRes.data || !matchRes.data
        ) {
          setError("Erro ao buscar dados da partida");
          return false;
        }

        const currentGoals = scorerRes.data.goals_scored ?? 0;
        const currentTeamScore = team === "A"
          ? (matchRes.data.team_a_score ?? 0)
          : (matchRes.data.team_b_score ?? 0);

        type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
        const scoreUpdatePayload: MatchUpdate = team === "A"
          ? { team_a_score: currentTeamScore + 1 }
          : { team_b_score: currentTeamScore + 1 };

        const updates: SupabaseUpdatePromise[] = [
          supabase
            .from("match_players")
            .update({ goals_scored: currentGoals + 1 })
            .eq("id", scorerRes.data.id),
          supabase
            .from("matches")
            .update(scoreUpdatePayload)
            .eq("id", matchId),
        ];

        if (assistUserId) {
          const assistRes = await supabase
            .from("match_players")
            .select("id, assists")
            .eq("match_id", matchId)
            .eq("user_id", assistUserId)
            .maybeSingle();

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

        const hasError = results.some((r) => r.error);
        if (hasError) {
          setError("Erro ao registrar gol");
          return false;
        }

        await fetchReviewData();
        return true;
      } finally {
        setSaving(false);
      }
    },
    [matchId, groupId, fetchReviewData],
  );

  const addOwnGoal = useCallback(
    async (scorerUserId: string | null, scorerTeam: string | null) => {
      if (!matchId) return false;
      setSaving(true);
      try {
        const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
        if (!valid) {
          setError(guardError ?? "Validação de grupo falhou");
          return false;
        }

        const [matchRes, scorerRes] = await Promise.all([
          supabase
            .from("matches")
            .select("team_a_score, team_b_score")
            .eq("id", matchId)
            .single(),
          scorerUserId
            ? supabase
              .from("match_players")
              .select("id, own_goals_scored")
              .eq("match_id", matchId)
              .eq("user_id", scorerUserId)
              .maybeSingle()
            : null,
        ]);

        if (matchRes.error || !matchRes.data) {
          setError("Erro ao buscar placar");
          return false;
        }

        const teamBenefited = scorerTeam === "A" ? "B" : "A";
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

        const hasError = results.some((r) => r.error);
        if (hasError) {
          setError("Erro ao registrar gol contra");
          return false;
        }

        await fetchReviewData();
        return true;
      } finally {
        setSaving(false);
      }
    },
    [matchId, groupId, fetchReviewData],
  );

  const removeGoal = useCallback(async (userId: string) => {
    if (!matchId) return false;
    setSaving(true);
    try {
      const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
      if (!valid) {
        setError(guardError ?? "Validação de grupo falhou");
        return false;
      }

      const playerRes = await supabase
        .from("match_players")
        .select("id, goals_scored, team")
        .eq("match_id", matchId)
        .eq("user_id", userId)
        .maybeSingle();

      if (
        playerRes.error || !playerRes.data ||
        (playerRes.data.goals_scored ?? 0) <= 0
      ) {
        return false;
      }

      const team = playerRes.data.team as "A" | "B";

      const [matchRes] = await Promise.all([
        supabase.from("matches").select("team_a_score, team_b_score").eq(
          "id",
          matchId,
        ).single(),
        supabase.from("match_players").update({
          goals_scored: (playerRes.data.goals_scored ?? 1) - 1,
        }).eq("id", playerRes.data.id),
      ]);

      if (matchRes.data) {
        type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
        const scoreUpdatePayload: MatchUpdate = team === "A"
          ? { team_a_score: Math.max(0, (matchRes.data.team_a_score ?? 0) - 1) }
          : { team_b_score: Math.max(0, (matchRes.data.team_b_score ?? 0) - 1) };

        await supabase.from("matches").update(scoreUpdatePayload).eq(
          "id",
          matchId,
        );
      }

      await fetchReviewData();
      return true;
    } finally {
      setSaving(false);
    }
  }, [matchId, groupId, fetchReviewData]);

  const removeAssist = useCallback(async (userId: string) => {
    if (!matchId) return false;
    setSaving(true);
    try {
      const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
      if (!valid) {
        setError(guardError ?? "Validação de grupo falhou");
        return false;
      }

      const playerRes = await supabase
        .from("match_players")
        .select("id, assists")
        .eq("match_id", matchId)
        .eq("user_id", userId)
        .maybeSingle();

      if (
        playerRes.error || !playerRes.data || (playerRes.data.assists ?? 0) <= 0
      ) {
        return false;
      }

      await supabase.from("match_players").update({
        assists: (playerRes.data.assists ?? 1) - 1,
      }).eq("id", playerRes.data.id);
      await fetchReviewData();
      return true;
    } finally {
      setSaving(false);
    }
  }, [matchId, groupId, fetchReviewData]);

  const removeOwnGoal = useCallback(async (userId: string) => {
    if (!matchId) return false;
    setSaving(true);
    try {
      const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
      if (!valid) {
        setError(guardError ?? "Validação de grupo falhou");
        return false;
      }

      const playerRes = await supabase
        .from("match_players")
        .select("id, own_goals_scored, team")
        .eq("match_id", matchId)
        .eq("user_id", userId)
        .maybeSingle();

      if (
        playerRes.error || !playerRes.data ||
        (playerRes.data.own_goals_scored ?? 0) <= 0
      ) {
        return false;
      }

      const team = playerRes.data.team as "A" | "B";
      const teamBenefited = team === "A" ? "B" : "A";

      const [matchRes] = await Promise.all([
        supabase.from("matches").select("team_a_score, team_b_score").eq(
          "id",
          matchId,
        ).single(),
        supabase.from("match_players").update({
          own_goals_scored: (playerRes.data.own_goals_scored ?? 1) - 1,
        }).eq("id", playerRes.data.id),
      ]);

      if (matchRes.data) {
        type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
        const scoreUpdatePayload: MatchUpdate = teamBenefited === "A"
          ? { team_a_score: Math.max(0, (matchRes.data.team_a_score ?? 0) - 1) }
          : { team_b_score: Math.max(0, (matchRes.data.team_b_score ?? 0) - 1) };

        await supabase.from("matches").update(scoreUpdatePayload).eq(
          "id",
          matchId,
        );
      }

      await fetchReviewData();
      return true;
    } finally {
      setSaving(false);
    }
  }, [matchId, groupId, fetchReviewData]);

  const addAssistOnly = useCallback(async (userId: string) => {
    if (!matchId) return false;
    setSaving(true);
    try {
      const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
      if (!valid) {
        setError(guardError ?? "Validação de grupo falhou");
        return false;
      }

      const playerRes = await supabase
        .from("match_players")
        .select("id, assists")
        .eq("match_id", matchId)
        .eq("user_id", userId)
        .maybeSingle();

      if (playerRes.error || !playerRes.data) {
        return false;
      }

      await supabase.from("match_players").update({
        assists: (playerRes.data.assists ?? 0) + 1,
      }).eq("id", playerRes.data.id);
      await fetchReviewData();
      return true;
    } finally {
      setSaving(false);
    }
  }, [matchId, groupId, fetchReviewData]);

  return {
    match,
    loading,
    saving,
    error,
    updateScore,
    startVoting,
    addGoal,
    addOwnGoal,
    removeGoal,
    removeAssist,
    removeOwnGoal,
    addAssistOnly,
    refetch: fetchReviewData,
  };
}
