import { useState, useCallback } from "react";
import type { MatchPlayer } from "./useMatches";

type SheetPhase = "closed" | "goal_type" | "assist";

interface PlayerStats {
  [userId: string]: { goals: number; assists: number; ownGoals: number };
}

interface UseLiveMatchViewProps {
  teamAPlayers: MatchPlayer[];
  teamBPlayers: MatchPlayer[];
  onGoalScored: (scorer: MatchPlayer, assist: MatchPlayer | null) => void;
  onOwnGoal: (teamBenefited: string, scorerUserId: string | null, scorerTeam: string | null) => void;
  busy?: boolean;
}

export function useLiveMatchView({
  teamAPlayers,
  teamBPlayers,
  onGoalScored,
  onOwnGoal,
  busy = false,
}: UseLiveMatchViewProps) {
  const [sheetPhase, setSheetPhase] = useState<SheetPhase>("closed");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({});

  const getStats = useCallback((userId: string | null) => {
    if (!userId) return { goals: 0, assists: 0, ownGoals: 0 };
    const local = playerStats[userId];
    const player = [...teamAPlayers, ...teamBPlayers].find((p) => p.userId === userId);
    return {
      goals: Math.max(local?.goals ?? 0, player?.goalsScored ?? 0),
      assists: Math.max(local?.assists ?? 0, player?.assists ?? 0),
      ownGoals: Math.max(local?.ownGoals ?? 0, player?.ownGoalsScored ?? 0),
    };
  }, [playerStats, teamAPlayers, teamBPlayers]);

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
  }, []);

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

  const sameTeamPlayers = selectedPlayer?.team === "A" ? teamAPlayers : teamBPlayers;
  const assistCandidates = sameTeamPlayers.filter((p) => p.userId && p.userId !== selectedPlayer?.userId);
  const sheetOpen = sheetPhase !== "closed";

  return {
    sheetPhase,
    selectedPlayer,
    playerStats,
    getStats,
    assistCandidates,
    sheetOpen,
    handlePlayerClick,
    handleGoal,
    handleOwnGoal,
    handleAssistSelect,
    closeSheet,
  };
}
