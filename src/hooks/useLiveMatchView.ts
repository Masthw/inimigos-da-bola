import { useState, useCallback } from "react";
import type { MatchPlayer } from "../../hooks/useMatches";

type SheetPhase = "closed" | "goal_type" | "assist" | "finish";

interface PlayerStats {
  [userId: string]: { goals: number; assists: number; ownGoals: number };
}

interface UseLiveMatchViewProps {
  teamAScore: number;
  teamBScore: number;
  teamAPlayers: MatchPlayer[];
  teamBPlayers: MatchPlayer[];
  onGoalScored: (scorer: MatchPlayer, assist: MatchPlayer | null) => void;
  onOwnGoal: (teamBenefited: string, scorerUserId: string | null, scorerTeam: string | null) => void;
  onRequestReview: () => void;
  onSaveScores?: (scoreA: number, scoreB: number) => void;
  busy?: boolean;
}

export function useLiveMatchView({
  teamAScore,
  teamBScore,
  teamAPlayers,
  teamBPlayers,
  onGoalScored,
  onOwnGoal,
  onRequestReview,
  onSaveScores,
  busy = false,
}: UseLiveMatchViewProps) {
  const [sheetPhase, setSheetPhase] = useState<SheetPhase>("closed");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);
  const [editScore, setEditScore] = useState({ teamA: teamAScore, teamB: teamBScore });
  const [playerStats, setPlayerStats] = useState<PlayerStats>({});

  const getStats = useCallback((userId: string | null) => {
    if (!userId) return { goals: 0, assists: 0, ownGoals: 0 };
    return playerStats[userId] || { goals: 0, assists: 0, ownGoals: 0 };
  }, [playerStats]);

  const updateStats = useCallback((scorerId: string | null, assistId: string | null) => {
    setPlayerStats((prev) => {
      const next = { ...prev };
      if (scorerId) {
        next[scorerId] = { goals: (next[scorerId]?.goals || 0) + 1, assists: next[scorerId]?.assists || 0, ownGoals: next[scorerId]?.ownGoals || 0 };
      }
      if (assistId) {
        next[assistId] = { goals: next[assistId]?.goals || 0, assists: (next[assistId]?.assists || 0) + 1, ownGoals: next[assistId]?.ownGoals || 0 };
      }
      return next;
    });
  }, []);

  const updateOwnGoalStats = useCallback((playerId: string | null) => {
    setPlayerStats((prev) => {
      const next = { ...prev };
      if (playerId) {
        next[playerId] = { goals: next[playerId]?.goals || 0, assists: next[playerId]?.assists || 0, ownGoals: (next[playerId]?.ownGoals || 0) + 1 };
      }
      return next;
    });
  }, []);

  const closeSheet = useCallback(() => {
    setSheetPhase("closed");
    setSelectedPlayer(null);
    setEditScore({ teamA: teamAScore, teamB: teamBScore });
  }, [teamAScore, teamBScore]);

  const handlePlayerClick = useCallback((player: MatchPlayer) => {
    if (busy) return;
    setSelectedPlayer(player);
    setSheetPhase("goal_type");
  }, [busy]);

  const handleGoal = useCallback(() => {
    setSheetPhase("assist");
  }, []);

  const handleOwnGoal = useCallback(() => {
    if (!selectedPlayer) return;
    const teamBenefited = selectedPlayer.team === "A" ? "B" : "A";
    updateOwnGoalStats(selectedPlayer.userId);
    onOwnGoal(teamBenefited, selectedPlayer.userId, selectedPlayer.team);
    closeSheet();
  }, [selectedPlayer, updateOwnGoalStats, onOwnGoal, closeSheet]);

  const handleAssistSelect = useCallback((assist: MatchPlayer | null) => {
    if (!selectedPlayer) return;
    updateStats(selectedPlayer.userId, assist?.userId || null);
    onGoalScored(selectedPlayer, assist);
    closeSheet();
  }, [selectedPlayer, updateStats, onGoalScored, closeSheet]);

  const handleFinishConfirm = useCallback(() => {
    if (onSaveScores) {
      onSaveScores(editScore.teamA, editScore.teamB);
    }
    closeSheet();
    onRequestReview();
  }, [onSaveScores, editScore, onRequestReview, closeSheet]);

  const sameTeamPlayers = selectedPlayer?.team === "A" ? teamAPlayers : teamBPlayers;
  const assistCandidates = sameTeamPlayers.filter((p) => p.userId && p.userId !== selectedPlayer?.userId);
  const sheetOpen = sheetPhase !== "closed";

  return {
    sheetPhase,
    selectedPlayer,
    editScore,
    setEditScore,
    playerStats,
    getStats,
    assistCandidates,
    sheetOpen,
    handlePlayerClick,
    handleGoal,
    handleOwnGoal,
    handleAssistSelect,
    handleFinishConfirm,
    closeSheet,
  };
}
