import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { Avatar } from "../components/ui/Avatar";
import { useMatchReview } from "../hooks/useMatchReview";
import { useActiveGroup } from "../hooks/useActiveGroup";
import type { MatchPlayer } from "../hooks/useMatches";

type SheetPhase = "closed" | "goal_type" | "assist" | "manage";

export default function MatchReview() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { activeGroupId } = useActiveGroup();
  const { match, loading, saving, error, updateScore, startVoting, addGoal, addOwnGoal, removeGoal, removeAssist, removeOwnGoal, addAssistOnly } =
    useMatchReview(matchId, activeGroupId);

  const [manualScore, setManualScore] = useState<{ teamA: number; teamB: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sheetPhase, setSheetPhase] = useState<SheetPhase>("closed");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);

  const currentScoreA = manualScore?.teamA ?? match?.teamAScore ?? 0;
  const currentScoreB = manualScore?.teamB ?? match?.teamBScore ?? 0;

  const handleStartVoting = async () => {
    const scoreUpdated = await updateScore(currentScoreA, currentScoreB);
    if (!scoreUpdated) return;

    const votingStarted = await startVoting();
    if (votingStarted) {
      navigate(`/matches/${matchId}/vote`);
    }
  };

  const handlePlayerClick = (player: { userId: string; name: string; team: string }) => {
    if (saving || !player.userId) return;

    setSelectedPlayer({
      userId: player.userId,
      name: player.name,
      avatarUrl: null,
      team: player.team as "A" | "B",
    });

    const goalCount = match?.goals.filter((g) => g.playerId === player.userId).length ?? 0;
    const assistCount = match?.assists.filter((a) => a.assistPlayerId === player.userId).length ?? 0;
    const ownGoalCount = match?.ownGoals.filter((og) => og.playerId === player.userId).length ?? 0;

    if (goalCount > 0 || assistCount > 0 || ownGoalCount > 0) {
      setSheetPhase("manage");
    } else {
      setSheetPhase("goal_type");
    }
  };

  const handleGoal = () => {
    setSheetPhase("assist");
  };

  const handleOwnGoal = async () => {
    if (!selectedPlayer?.userId || !selectedPlayer.team) return;
    await addOwnGoal(selectedPlayer.userId, selectedPlayer.team);
    closeSheet();
  };

  const handleAddAssistOnly = async () => {
    if (!selectedPlayer?.userId) return;
    await addAssistOnly(selectedPlayer.userId);
    closeSheet();
  };

  const handleRemoveGoal = async () => {
    if (!selectedPlayer?.userId) return;
    await removeGoal(selectedPlayer.userId);
  };

  const handleRemoveAssist = async () => {
    if (!selectedPlayer?.userId) return;
    await removeAssist(selectedPlayer.userId);
  };

  const handleRemoveOwnGoal = async () => {
    if (!selectedPlayer?.userId) return;
    await removeOwnGoal(selectedPlayer.userId);
  };

  // Tipagem ajustada para a assistência
  const handleAssistSelect = async (assist: { userId: string } | null) => {
    if (!selectedPlayer?.userId || !selectedPlayer.team) return;
    await addGoal(selectedPlayer.userId, selectedPlayer.team, assist?.userId || null);
    closeSheet();
  };

  const closeSheet = () => {
    setSheetPhase("closed");
    setSelectedPlayer(null);
  };

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

  const teamAPlayers = match.players.filter((p) => p.team === "A");
  const teamBPlayers = match.players.filter((p) => p.team === "B");
  const teamAGoals = match.goals.filter((g) => g.team === "A");
  const teamBGoals = match.goals.filter((g) => g.team === "B");

  const sameTeamPlayers = selectedPlayer?.team === "A" ? teamAPlayers : teamBPlayers;
  const assistCandidates = sameTeamPlayers.filter((p) => p.userId && p.userId !== selectedPlayer?.userId);

  const sheetOpen = sheetPhase !== "closed";

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <MaterialIcon name="arrow_back" className="w-5 h-5" />
            <span className="font-mono text-label-sm">Voltar</span>
          </button>
          <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase">Revisar Partida</h2>
          <div className="w-20" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-6">
          <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant">
            <p className="font-mono text-label-sm text-on-surface-variant uppercase tracking-widest mb-4 text-center">Placar Final</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-center">
                <p className="font-mono text-label-sm uppercase truncate mb-2" style={{ color: match.teamAColor }}>
                  {match.teamAName}
                </p>
                <input
                  type="number"
                  min={0}
                  value={currentScoreA}
                  onChange={(e) => setManualScore({ teamA: Number(e.target.value), teamB: currentScoreB })}
                  className="w-20 bg-surface-variant border border-outline-variant px-3 py-2 font-display text-headline-md text-on-surface text-center appearance-none"
                />
              </div>
              <span className="text-headline-md font-mono text-on-surface-variant pt-6">x</span>
              <div className="text-center">
                <p className="font-mono text-label-sm uppercase truncate mb-2" style={{ color: match.teamBColor }}>
                  {match.teamBName}
                </p>
                <input
                  type="number"
                  min={0}
                  value={currentScoreB}
                  onChange={(e) => setManualScore({ teamA: currentScoreA, teamB: Number(e.target.value) })}
                  className="w-20 bg-surface-variant border border-outline-variant px-3 py-2 font-display text-headline-md text-on-surface text-center appearance-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: match.teamAColor }} />
              <p className="font-mono text-label-bold uppercase tracking-widest" style={{ color: match.teamAColor }}>
                Gols - {match.teamAName}
              </p>
            </div>
            {teamAGoals.length === 0 ? (
              <p className="font-mono text-label-sm text-on-surface-variant py-2">Nenhum gol registrado</p>
            ) : (
              <div className="space-y-2">
                {teamAGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3 p-2 bg-surface-variant/50 rounded-lg">
                    <span style={{ color: match.teamAColor }} className="flex items-center">
                      <MaterialIcon name="sports_soccer" className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-label-sm text-on-surface flex-1">{goal.playerName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: match.teamBColor }} />
              <p className="font-mono text-label-bold uppercase tracking-widest" style={{ color: match.teamBColor }}>
                Gols - {match.teamBName}
              </p>
            </div>
            {teamBGoals.length === 0 ? (
              <p className="font-mono text-label-sm text-on-surface-variant py-2">Nenhum gol registrado</p>
            ) : (
              <div className="space-y-2">
                {teamBGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3 p-2 bg-surface-variant/50 rounded-lg">
                    <span style={{ color: match.teamBColor }} className="flex items-center">
                      <MaterialIcon name="sports_soccer" className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-label-sm text-on-surface flex-1">{goal.playerName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
            <div className="flex items-center gap-2 mb-3">
              <MaterialIcon name="sports_motorsports" className="w-4 h-4 text-tertiary" />
              <p className="font-mono text-label-bold uppercase tracking-widest text-tertiary">Assistências</p>
            </div>
            {match.assists.length === 0 ? (
              <p className="font-mono text-label-sm text-on-surface-variant py-2">Nenhuma assistência registrada</p>
            ) : (
              <div className="space-y-2">
                {match.assists.map((assist) => (
                  <div key={assist.id} className="flex items-center gap-3 p-2 bg-surface-variant/50 rounded-lg">
                    <MaterialIcon name="send" className="w-4 h-4 text-tertiary" />
                    <span className="font-mono text-label-sm text-on-surface">{assist.assistPlayerName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
            <div className="flex items-center gap-2 mb-3">
              <MaterialIcon name="warning" className="w-4 h-4 text-error" />
              <p className="font-mono text-label-bold uppercase tracking-widest text-error">Gols Contra</p>
            </div>
            {match.ownGoals.length === 0 ? (
              <p className="font-mono text-label-sm text-on-surface-variant py-2">Nenhum gol contra registrado</p>
            ) : (
              <div className="space-y-2">
                {match.ownGoals.map((og) => (
                  <div key={og.id} className="flex items-center gap-3 p-2 bg-surface-variant/50 rounded-lg">
                    <MaterialIcon name="warning" className="w-4 h-4 text-error" />
                    <span className="font-mono text-label-sm text-on-surface flex-1">{og.playerName}</span>
                    <span className="font-mono text-[10px] text-on-surface-variant">{og.team === "A" ? match.teamAName : match.teamBName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
            <p className="font-mono text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">Registrar Gol</p>
            <p className="font-mono text-[11px] text-on-surface-variant mb-3">Toque em um jogador para registrar gol</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {teamAPlayers.map((p) => (
                  <button
                    key={p.userId}
                    type="button"
                    disabled={saving}
                    onClick={() => handlePlayerClick(p)}
                    className="w-full text-left font-mono text-label-sm text-on-surface py-2 px-2 hover:bg-surface-variant/50 rounded transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div>
                {teamBPlayers.map((p) => (
                  <button
                    key={p.userId}
                    type="button"
                    disabled={saving}
                    onClick={() => handlePlayerClick(p)}
                    className="w-full text-left font-mono text-label-sm text-on-surface py-2 px-2 hover:bg-surface-variant/50 rounded transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 border-t border-outline-variant bg-surface-container">
          <button
            type="button"
            disabled={saving}
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover transition-transform"
          >
            {saving ? "Salvando..." : "Confirmar e Abrir Votação"}
          </button>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-high rounded-2xl p-6 max-w-sm w-full border border-outline-variant">
              <MaterialIcon name="how_to_vote" className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-headline-sm font-display text-on-surface text-center mb-2">Abrir Votação?</h3>
              <p className="font-mono text-label-sm text-on-surface-variant text-center mb-6">
                Os jogadores poderão votar nos prêmios da partida por <strong className="text-on-surface">2 horas</strong>. O placar será atualizado
                para{" "}
                <strong className="text-on-surface">
                  {currentScoreA} x {currentScoreB}
                </strong>
                {""}.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleStartVoting}
                  className="flex-1 py-3 bg-primary text-on-primary font-mono text-label-bold active:bg-primary/80 transition-colors"
                >
                  {saving ? "..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {sheetOpen && (
        <button
          type="button"
          aria-label="Fechar painel"
          className="fixed inset-0 w-full h-full bg-black/50 z-40 cursor-default border-none outline-none appearance-none"
          onClick={closeSheet}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-surface-container-high rounded-t-2xl border-t border-outline-variant transition-transform duration-300 ease-out ${
          sheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        <div className="px-5 pb-8 max-h-[70vh] overflow-y-auto">
          {(sheetPhase === "manage" || sheetPhase === "goal_type") &&
            selectedPlayer &&
            (() => {
              const goalCount = match.goals.filter((g) => g.playerId === selectedPlayer.userId).length;
              const assistCount = match.assists.filter((a) => a.assistPlayerId === selectedPlayer.userId).length;
              const ownGoalCount = match.ownGoals.filter((og) => og.playerId === selectedPlayer.userId).length;
              const hasAny = goalCount > 0 || assistCount > 0 || ownGoalCount > 0;
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={selectedPlayer.avatarUrl} alt={selectedPlayer.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-mono text-label-bold text-on-surface">{selectedPlayer.name}</p>
                      <p className="font-mono text-label-sm" style={{ color: selectedPlayer.team === "A" ? match.teamAColor : match.teamBColor }}>
                        {selectedPlayer.team === "A" ? match.teamAName : match.teamBName}
                      </p>
                    </div>
                  </div>

                  {hasAny && (
                    <div className="space-y-2">
                      <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Remover</p>
                      <div className="flex flex-wrap gap-2">
                        {goalCount > 0 && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleRemoveGoal}
                            className="flex items-center gap-2 px-3 py-2 bg-error/10 text-error font-mono text-label-sm border border-error/20 active:bg-error/20 transition-colors"
                          >
                            <MaterialIcon name="remove_circle" className="w-4 h-4" />
                            {goalCount} {goalCount === 1 ? "Gol" : "Gols"}
                          </button>
                        )}
                        {assistCount > 0 && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleRemoveAssist}
                            className="flex items-center gap-2 px-3 py-2 bg-error/10 text-error font-mono text-label-sm border border-error/20 active:bg-error/20 transition-colors"
                          >
                            <MaterialIcon name="remove_circle" className="w-4 h-4" />
                            {assistCount} {assistCount === 1 ? "Assist." : "Assists."}
                          </button>
                        )}
                        {ownGoalCount > 0 && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleRemoveOwnGoal}
                            className="flex items-center gap-2 px-3 py-2 bg-error/10 text-error font-mono text-label-sm border border-error/20 active:bg-error/20 transition-colors"
                          >
                            <MaterialIcon name="remove_circle" className="w-4 h-4" />
                            {ownGoalCount} {ownGoalCount === 1 ? "Gol Contra" : "Gols Contra"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleGoal}
                        className="flex flex-col items-center gap-2 py-4 bg-primary-container text-primary font-mono text-label-bold border border-primary/30 active:bg-primary/20 transition-colors"
                      >
                        <MaterialIcon name="sports_soccer" className="w-6 h-6" />
                        Gol
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleOwnGoal}
                        className="flex flex-col items-center gap-2 py-4 bg-warning/15 text-warning font-mono text-label-bold border border-warning/30 active:bg-warning/25 transition-colors"
                      >
                        <MaterialIcon name="error" className="w-6 h-6" />
                        Gol Contra
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleAddAssistOnly}
                      className="w-full flex flex-col items-center gap-2 py-4 bg-secondary-container text-secondary font-mono text-label-bold border border-secondary/30 active:bg-secondary/20 transition-colors"
                    >
                      <MaterialIcon name="send" className="w-6 h-6" />
                      Assistência
                    </button>
                  </div>
                </div>
              );
            })()}

          {sheetPhase === "assist" && selectedPlayer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={selectedPlayer.avatarUrl} alt={selectedPlayer.name} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-mono text-label-bold" style={{ color: selectedPlayer.team === "A" ? match.teamAColor : match.teamBColor }}>
                    Gol do {selectedPlayer.name}!
                  </p>
                  <p className="font-mono text-label-sm text-on-surface-variant">Quem deu a assistência?</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleAssistSelect(null)}
                  className="w-full py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
                >
                  Sem assistência
                </button>
                {assistCandidates.map((p) => (
                  <button
                    key={p.userId}
                    type="button"
                    disabled={saving}
                    onClick={() => handleAssistSelect(p)}
                    className="w-full flex items-center gap-3 py-3 px-4 bg-surface-variant border border-outline-variant active:bg-surface-container-high transition-colors"
                  >
                    <Avatar src={null} alt={p.name} className="w-8 h-8 rounded-full" />
                    <span className="font-mono text-label-sm text-on-surface">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
