import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatchReview } from "../hooks/useMatchReview";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useAuth } from "../hooks/useAuth";
import type { MatchPlayer } from "../hooks/useMatches";

type SheetPhase = "closed" | "goal_type" | "assist" | "manage";

export function useMatchReviewSheet() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { activeGroupId } = useActiveGroup();
  const { user } = useAuth();
  const matchReview = useMatchReview(matchId, activeGroupId);

  const [manualScore, setManualScore] = useState<{ teamA: number; teamB: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sheetPhase, setSheetPhase] = useState<SheetPhase>("closed");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);

  const { match, saving, updateScore, startVoting, addGoal, addOwnGoal, removeGoal, removeAssist, removeOwnGoal, addAssistOnly } = matchReview;

  const currentScoreA = manualScore?.teamA ?? match?.teamAScore ?? 0;
  const currentScoreB = manualScore?.teamB ?? match?.teamBScore ?? 0;

  const teamAPlayers = match?.players.filter((p) => p.team === "A") ?? [];
  const teamBPlayers = match?.players.filter((p) => p.team === "B") ?? [];
  const teamAGoals = match?.goals.filter((g) => g.team === "A") ?? [];
  const teamBGoals = match?.goals.filter((g) => g.team === "B") ?? [];

  const sameTeamPlayers = selectedPlayer?.team === "A" ? teamAPlayers : teamBPlayers;
  const assistCandidates = sameTeamPlayers.filter((p) => p.userId && p.userId !== selectedPlayer?.userId);

  const sheetOpen = sheetPhase !== "closed";

  const getStats = useCallback(
    (userId: string) => {
      const goals = match?.goals.filter((g) => g.playerId === userId).length ?? 0;
      const assists = match?.assists.filter((a) => a.assistPlayerId === userId).length ?? 0;
      const ownGoals = match?.ownGoals.filter((og) => og.playerId === userId).length ?? 0;
      return { goals, assists, ownGoals };
    },
    [match],
  );

  const handleStartVoting = useCallback(async () => {
    const scoreUpdated = await updateScore(currentScoreA, currentScoreB);
    if (!scoreUpdated) return;

    const votingStarted = await startVoting();
    if (votingStarted && matchId) {
      navigate(`/matches/${matchId}/vote`);
    }
  }, [updateScore, startVoting, navigate, matchId, currentScoreA, currentScoreB]);

  const closeSheet = useCallback(() => {
    setSheetPhase("closed");
    setSelectedPlayer(null);
  }, []);

  const handlePlayerClick = useCallback(
    (player: MatchPlayer) => {
      if (saving || !player.userId) return;

      setSelectedPlayer({
        userId: player.userId,
        name: player.name,
        avatarUrl: player.avatarUrl ?? null,
        team: player.team as "A" | "B",
      });

      setSheetPhase("manage");
    },
    [saving],
  );

  const handleGoal = useCallback(() => {
    setSheetPhase("assist");
  }, []);

  const handleOwnGoal = useCallback(async () => {
    if (!selectedPlayer?.userId || !selectedPlayer.team) return;
    await addOwnGoal(selectedPlayer.userId, selectedPlayer.team);
    closeSheet();
  }, [selectedPlayer, addOwnGoal, closeSheet]);

  const handleAddAssistOnly = useCallback(async () => {
    if (!selectedPlayer?.userId) return;
    await addAssistOnly(selectedPlayer.userId);
    closeSheet();
  }, [selectedPlayer, addAssistOnly, closeSheet]);

  const handleRemoveGoal = useCallback(async () => {
    if (!selectedPlayer?.userId) return;
    await removeGoal(selectedPlayer.userId);
  }, [selectedPlayer, removeGoal]);

  const handleRemoveAssist = useCallback(async () => {
    if (!selectedPlayer?.userId) return;
    await removeAssist(selectedPlayer.userId);
  }, [selectedPlayer, removeAssist]);

  const handleRemoveOwnGoal = useCallback(async () => {
    if (!selectedPlayer?.userId) return;
    await removeOwnGoal(selectedPlayer.userId);
  }, [selectedPlayer, removeOwnGoal]);

  const handleAssistSelect = useCallback(async (assist: MatchPlayer | null) => {
    if (!selectedPlayer?.userId || !selectedPlayer.team) return;
    await addGoal(selectedPlayer.userId, selectedPlayer.team, assist?.userId || null);
    closeSheet();
  }, [selectedPlayer, addGoal, closeSheet]);

  return {
    ...matchReview,
    isAdmin: user?.id === match?.organizerId,
    manualScore,
    setManualScore,
    showConfirm,
    setShowConfirm,
    sheetPhase,
    selectedPlayer,
    currentScoreA,
    currentScoreB,
    teamAPlayers,
    teamBPlayers,
    teamAGoals,
    teamBGoals,
    assistCandidates,
    sheetOpen,
    getStats,
    handleStartVoting,
    handlePlayerClick,
    handleGoal,
    handleOwnGoal,
    handleAddAssistOnly,
    handleRemoveGoal,
    handleRemoveAssist,
    handleRemoveOwnGoal,
    handleAssistSelect,
    closeSheet,
  };
}
