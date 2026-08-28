import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { useMatchReviewSheet } from "../hooks/useMatchReviewSheet";
import { MatchEventList, MatchEventListItem, MatchEventEmpty } from "../components/match/MatchEventList";
import { MatchReviewSheet } from "../components/match/MatchReviewSheet";

export default function MatchReview() {
  const navigate = useNavigate();
  const {
    match,
    loading,
    saving,
    error,
    isAdmin,
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
  } = useMatchReviewSheet();

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
                  id="review-score-team-a"
                  type="number"
                  min={0}
                  value={currentScoreA}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualScore({ teamA: val === "" ? 0 : Number(val) || 0, teamB: currentScoreB });
                  }}
                  disabled={!isAdmin}
                  className="w-20 bg-surface-variant border border-outline-variant px-3 py-2 font-display text-headline-md text-on-surface text-center appearance-none disabled:opacity-50"
                  aria-label={`Placar do ${match.teamAName}`}
                />
              </div>
              <span className="text-headline-md font-mono text-on-surface-variant pt-6">x</span>
              <div className="text-center">
                <p className="font-mono text-label-sm uppercase truncate mb-2" style={{ color: match.teamBColor }}>
                  {match.teamBName}
                </p>
                <input
                  id="review-score-team-b"
                  type="number"
                  min={0}
                  value={currentScoreB}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualScore({ teamA: currentScoreA, teamB: val === "" ? 0 : Number(val) || 0 });
                  }}
                  disabled={!isAdmin}
                  className="w-20 bg-surface-variant border border-outline-variant px-3 py-2 font-display text-headline-md text-on-surface text-center appearance-none disabled:opacity-50"
                  aria-label={`Placar do ${match.teamBName}`}
                />
              </div>
            </div>
          </div>

          {!isAdmin && (
            <div className="bg-secondary-container/30 border border-secondary/30 rounded-xl p-3 flex items-center gap-2">
              <MaterialIcon name="visibility" className="w-4 h-4 text-secondary shrink-0" />
              <p className="font-mono text-label-sm text-secondary">Modo visualização — apenas admins podem editar</p>
            </div>
          )}

          <MatchEventList
            iconColor={match.teamAColor}
            label={`Gols - ${match.teamAName}`}
          >
            {teamAGoals.length === 0 ? (
              <MatchEventEmpty text="Nenhum gol registrado" />
            ) : (
              <div className="space-y-2">
                {teamAGoals.map((goal) => (
                  <MatchEventListItem key={goal.id} icon="sports_soccer" iconClassName={`flex items-center`} style={{ color: match.teamAColor }} name={goal.playerName} />
                ))}
              </div>
            )}
          </MatchEventList>

          <MatchEventList
            iconColor={match.teamBColor}
            label={`Gols - ${match.teamBName}`}
          >
            {teamBGoals.length === 0 ? (
              <MatchEventEmpty text="Nenhum gol registrado" />
            ) : (
              <div className="space-y-2">
                {teamBGoals.map((goal) => (
                  <MatchEventListItem key={goal.id} icon="sports_soccer" iconClassName={`flex items-center`} style={{ color: match.teamBColor }} name={goal.playerName} />
                ))}
              </div>
            )}
          </MatchEventList>

          <MatchEventList
            iconColor="text-tertiary"
            label="Assistências"
          >
            {match.assists.length === 0 ? (
              <MatchEventEmpty text="Nenhuma assistência registrada" />
            ) : (
              <div className="space-y-2">
                {match.assists.map((assist) => (
                  <MatchEventListItem key={assist.id} icon="send" iconClassName="text-tertiary" name={assist.assistPlayerName} />
                ))}
              </div>
            )}
          </MatchEventList>

          <MatchEventList
            iconColor="text-error"
            label="Gols Contra"
          >
            {match.ownGoals.length === 0 ? (
              <MatchEventEmpty text="Nenhum gol contra registrado" />
            ) : (
              <div className="space-y-2">
                {match.ownGoals.map((og) => (
                  <MatchEventListItem key={og.id} icon="warning" iconClassName="text-error" name={og.playerName} secondary={og.team === "A" ? match.teamAName : match.teamBName} />
                ))}
              </div>
            )}
          </MatchEventList>

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
            disabled={saving || !isAdmin}
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover transition-transform disabled:opacity-50"
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

      <MatchReviewSheet
        match={match}
        selectedPlayer={selectedPlayer}
        saving={saving}
        sheetPhase={sheetPhase}
        assistCandidates={assistCandidates}
        onClose={closeSheet}
        onGoal={handleGoal}
        onOwnGoal={handleOwnGoal}
        onAddAssistOnly={handleAddAssistOnly}
        onRemoveGoal={handleRemoveGoal}
        onRemoveAssist={handleRemoveAssist}
        onRemoveOwnGoal={handleRemoveOwnGoal}
        onAssistSelect={handleAssistSelect}
      />
    </AppShell>
  );
}
