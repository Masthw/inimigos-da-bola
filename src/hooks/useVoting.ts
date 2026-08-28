import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";
import { validateMatchGroup } from "../lib/groupGuard";

export interface VotingAward {
  id: number;
  name: string;
  isAutomatic: boolean;
  voteCounts?: Record<string, number>;
}

export interface VotingPlayer {
  userId: string;
  name: string;
  team: "A" | "B";
  goalsScored: number;
  assists: number;
  voteCount?: number;
}

export interface Vote {
  awardId: number;
  votedUserId: string | null;
}

export interface VotingData {
  matchId: string;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamAScore: number;
  teamBScore: number;
  votingEndsAt: string;
  awards: VotingAward[];
  players: VotingPlayer[];
  votes: Vote[];
  hasVotedCraque: boolean;
}

export function useVoting(matchId: string | undefined, groupId: string | null = null) {
  const { user } = useAuth();
  const [votingData, setVotingData] = useState<VotingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVotingData = useCallback(async () => {
    if (!matchId || !user) return;

    const [matchRes, playersRes, awardsRes, votesRes] = await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, team_a_name, team_b_name, team_a_color, team_b_color, team_a_score, team_b_score, voting_ends_at, status",
        )
        .eq("id", matchId)
        .single(),
      supabase
        .from("match_players")
        .select("user_id, guest_name, team, goals_scored, assists, users(name)")
        .eq("match_id", matchId)
        .eq("status", "confirmed"),
      supabase
        .from("awards")
        .select("id, name, description, is_voting_based"),
      supabase
        .from("match_votes")
        .select("award_id, voted_user_id")
        .eq("match_id", matchId)
        .eq("voter_user_id", user.id),
    ]);

    if (matchRes.error || !matchRes.data) {
      setError("Partida não encontrada");
      setLoading(false);
      return;
    }

    if (matchRes.data.status !== "voting") {
      setError("Votação não está aberta");
      setLoading(false);
      return;
    }

    const players: VotingPlayer[] = (playersRes.data ?? []).map((row) => ({
      userId: row.user_id ?? "",
      name: row.users?.name ?? row.guest_name ?? "Convidado",
      team: row.team as "A" | "B",
      goalsScored: row.goals_scored ?? 0,
      assists: row.assists ?? 0,
    }));

    const automaticAwards: VotingAward[] = [
      { id: -1, name: "Goleador", isAutomatic: true },
      { id: -2, name: "Garçom", isAutomatic: true },
    ];

    const allVotesRes = await supabase
      .from("match_votes")
      .select("award_id, voted_user_id")
      .eq("match_id", matchId);

    const allVotes = allVotesRes.data ?? [];

    const votesByAward = new Map<number, Map<string, number>>();
    for (const v of allVotes) {
      if (!v.voted_user_id) continue;
      let awardVotes = votesByAward.get(v.award_id);
      if (!awardVotes) {
        awardVotes = new Map();
        votesByAward.set(v.award_id, awardVotes);
      }
      awardVotes.set(v.voted_user_id, (awardVotes.get(v.voted_user_id) || 0) + 1);
    }

    const votingAwards: VotingAward[] = [];
    for (const a of awardsRes.data ?? []) {
      if (!a.is_voting_based) continue;
      const voteCounts = votesByAward.get(a.id);
      votingAwards.push({
        id: a.id,
        name: a.name,
        isAutomatic: false,
        voteCounts: voteCounts ? Object.fromEntries(voteCounts) : {},
      });
    }

    const craqueAwards = votingAwards.filter((a) =>
      a.name.toLowerCase().includes("craque")
    );

    const votes: Vote[] = (votesRes.data ?? []).map((v) => ({
      awardId: v.award_id,
      votedUserId: v.voted_user_id,
    }));

    setVotingData({
      matchId: matchRes.data.id,
      teamAName: matchRes.data.team_a_name ?? "Time A",
      teamBName: matchRes.data.team_b_name ?? "Time B",
      teamAColor: matchRes.data.team_a_color ?? "#ef4444",
      teamBColor: matchRes.data.team_b_color ?? "#3b82f6",
      teamAScore: matchRes.data.team_a_score ?? 0,
      teamBScore: matchRes.data.team_b_score ?? 0,
      votingEndsAt: matchRes.data.voting_ends_at ?? new Date().toISOString(),
      awards: [...automaticAwards, ...votingAwards],
      players,
      votes,
      hasVotedCraque: votes.some((v) =>
        craqueAwards.some((a) => a.id === v.awardId)
      ),
    });
    setLoading(false);
  }, [matchId, user]);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!active) return;
      await fetchVotingData();
    }

    void run();

    return () => {
      active = false;
    };
  }, [fetchVotingData]);

  const submitVote = useCallback(
    async (awardId: number, votedUserId: string | null) => {
      if (!matchId || !user) return false;
      setSaving(true);
      try {
        const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
        if (!valid) {
          setError(guardError ?? "Validação de grupo falhou");
          return false;
        }

        if (votedUserId === null) {
          const { error } = await supabase
            .from("match_votes")
            .delete()
            .eq("match_id", matchId)
            .eq("voter_user_id", user.id)
            .eq("award_id", awardId);
          if (error) {
            setError("Erro ao remover voto");
            return false;
          }
        } else {
          const { error } = await supabase
            .from("match_votes")
            .upsert(
              {
                match_id: matchId,
                award_id: awardId,
                voter_user_id: user.id,
                voted_user_id: votedUserId,
              },
              { onConflict: "match_id,voter_user_id,award_id" },
            );
          if (error) {
            setError("Erro ao registrar voto");
            return false;
          }
        }
      } finally {
        setSaving(false);
      }

      await fetchVotingData();
      return true;
    },
    [matchId, groupId, user, fetchVotingData],
  );

  const hasVoted = useCallback((awardId: number) => {
    return votingData?.votes.some((v) => v.awardId === awardId) ?? false;
  }, [votingData]);

  const getVotedPlayers = useCallback((awardId: number) => {
    const votes = votingData?.votes;
    if (!votes) return [];
    const playerMap = new Map(votingData?.players.map((p) => [p.userId, p]));
    const result: VotingPlayer[] = [];
    for (const v of votes) {
      if (v.awardId === awardId && v.votedUserId) {
        const player = playerMap.get(v.votedUserId);
        if (player) result.push(player);
      }
    }
    return result;
  }, [votingData]);

  return {
    votingData,
    loading,
    saving,
    error,
    submitVote,
    hasVoted,
    getVotedPlayers,
    refetch: fetchVotingData,
  };
}
