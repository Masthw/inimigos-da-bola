import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { LiveMatchView } from "../components/match/LiveMatchView";
import { useLiveMatch } from "../hooks/useLiveMatch";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import type { MatchPlayer } from "../hooks/useMatches";

interface MatchData {
  id: string;
  status: string;
  teamAName: string | null;
  teamBName: string | null;
  teamAColor: string;
  teamBColor: string;
  teamAScore: number | null;
  teamBScore: number | null;
  organizerId: string;
}

export default function MatchLive() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { activeGroupId } = useActiveGroup();
  const { user } = useAuth();
  const { addGoal, addOwnGoal, busy } = useLiveMatch(activeGroupId);
  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!matchId) return;

    const [matchRes, playersRes] = await Promise.all([
      supabase
        .from("matches")
        .select("id, status, team_a_name, team_b_name, team_a_color, team_b_color, team_a_score, team_b_score, organizer_id")
        .eq("id", matchId)
        .single(),
      supabase
        .from("match_players")
        .select("user_id, guest_name, team, status, goals_scored, assists, own_goals_scored, users(name, avatar_url)")
        .eq("match_id", matchId)
        .eq("status", "confirmed"),
    ]);

    if (matchRes.error || !matchRes.data) {
      setError("Partida não encontrada");
      setLoading(false);
      return;
    }

    if (matchRes.data.status === "voting") {
      navigate(`/matches/${matchId}/vote`);
      return;
    }

    if (matchRes.data.status === "preparing") {
      navigate("/tactics");
      return;
    }

    if (matchRes.data.status === "finished" || matchRes.data.status === "cancelled") {
      navigate("/matches");
      return;
    }

    if (matchRes.data.status !== "in_progress") {
      navigate("/matches");
      return;
    }

    const matchData: MatchData = {
      id: matchRes.data.id,
      status: matchRes.data.status,
      teamAName: matchRes.data.team_a_name,
      teamBName: matchRes.data.team_b_name,
      teamAColor: matchRes.data.team_a_color ?? "#ef4444",
      teamBColor: matchRes.data.team_b_color ?? "#3b82f6",
      teamAScore: matchRes.data.team_a_score,
      teamBScore: matchRes.data.team_b_score,
      organizerId: matchRes.data.organizer_id,
    };

    const playerList: MatchPlayer[] = (playersRes.data ?? []).map((row) => ({
      userId: row.user_id,
      name: row.users?.name ?? row.guest_name ?? "Convidado",
      avatarUrl: row.users?.avatar_url ?? null,
      team: row.team,
      goalsScored: row.goals_scored ?? 0,
      assists: row.assists ?? 0,
      ownGoalsScored: row.own_goals_scored ?? 0,
    }));

    setMatch(matchData);
    setPlayers(playerList);
    setLoading(false);
  }, [matchId, navigate]);

  useEffect(() => {
    if (!matchId) return;

    const loadInitialData = async () => {
      await fetchData();
    };

    loadInitialData();

    const channel = supabase
      .channel(`match-live-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, () => {
        void fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_players", filter: `match_id=eq.${matchId}` }, () => {
        void fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchData]);
  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="font-mono text-label-sm text-on-surface-variant">Carregando partida...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !match) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <MaterialIcon name="error" className="w-10 h-10 text-error mx-auto mb-4" />
            <p className="font-mono text-label-bold text-on-surface">{error || "Erro ao carregar partida"}</p>
            <button
              type="button"
              onClick={() => navigate("/matches")}
              className="mt-4 px-4 py-2 font-mono text-label-sm text-primary hover:bg-surface-variant transition-colors"
            >
              Voltar para partidas
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const teamAPlayers = players.filter((p) => p.team === "A");
  const teamBPlayers = players.filter((p) => p.team === "B");
  const isCreator = user?.id === match?.organizerId;

  const handleGoalScored = async (scorer: MatchPlayer, assist: MatchPlayer | null) => {
    if (!match) return;
    await addGoal(match.id, scorer.userId ?? "", scorer.team ?? "A", assist?.userId || null);
    fetchData();
  };

  const handleOwnGoal = async (teamBenefited: string, scorerUserId: string | null) => {
    if (!match) return;
    await addOwnGoal(match.id, teamBenefited, scorerUserId);
    fetchData();
  };


  const handleRequestReview = () => {
    if (!match) return;
    navigate(`/matches/${match.id}/review`);
  };

  const handleManagePlayers = () => {
    if (!match) return;
    navigate(`/matches/${match.id}/players`);
  };

  return (
    <AppShell>
      <LiveMatchView
        matchId={match.id}
        teamAName={match.teamAName ?? "Time A"}
        teamBName={match.teamBName ?? "Time B"}
        teamAColor={match.teamAColor}
        teamBColor={match.teamBColor}
        teamAScore={match.teamAScore ?? 0}
        teamBScore={match.teamBScore ?? 0}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        onGoalScored={handleGoalScored}
        onOwnGoal={handleOwnGoal}
        onRequestReview={handleRequestReview}
        onManagePlayers={handleManagePlayers}
        isAdmin={isCreator}
        busy={busy}
      />
    </AppShell>
  );
}
