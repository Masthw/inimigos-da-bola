import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { useMatchReviewSheet } from "../hooks/useMatchReviewSheet";
import { MatchReviewSheet } from "../components/match/MatchReviewSheet";
import { MatchErrorState } from "../components/match/MatchErrorState";
import { PlayerCard } from "../components/match/PlayerCard";

export default function MatchReview() {
  const navigate = useNavigate();
  const {
    match,
    loading,
    saving,
    error,
    isAdmin,
    showConfirm,
    setShowConfirm,
    sheetPhase,
    selectedPlayer,
    currentScoreA,
    currentScoreB,
    teamAPlayers,
    teamBPlayers,
    assistCandidates,
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
    return <MatchErrorState message={error || "Erro ao carregar partida"} />;
  }

  return (
    <AppShell>
      <div className="h-[calc(100svh-4rem)] flex flex-col bg-surface relative overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container shrink-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <MaterialIcon name="arrow_back" className="w-5 h-5" />
            <span className="font-mono text-label-sm">Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <MaterialIcon name="fact_check" className="w-5 h-5 text-primary" />
            <h2 className="text-label-bold font-mono tracking-wider text-primary uppercase">Revisar Partida</h2>
          </div>
          <div className="w-14" />
        </header>

        {/* Admin notice or hint */}
        {!isAdmin ? (
          <div className="px-4 py-2 bg-secondary-container/30 border-b border-secondary/20 shrink-0">
            <p className="font-mono text-[11px] text-secondary text-center uppercase tracking-wider">
              Modo visualização — apenas o organizador pode ajustar dados
            </p>
          </div>
        ) : (
          <div className="px-4 py-2 bg-surface-container border-b border-outline-variant/40 shrink-0 text-center">
            <p className="font-mono text-[11px] text-on-surface-variant">
              Toque em um jogador para ajustar gols, assistências ou gols contra
            </p>
          </div>
        )}

        {/* Placar Final */}
        <div className="px-4 py-5 bg-surface-container-high border-b border-outline-variant shrink-0">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-w-lg mx-auto">
            <div className="text-center">
              <p className="font-mono text-label-sm uppercase truncate mb-1" style={{ color: match.teamAColor }}>
                {match.teamAName}
              </p>
              <p className="display-lg font-display font-bold leading-none" style={{ color: match.teamAColor }}>
                {currentScoreA}
              </p>
            </div>
            <span className="text-headline-md font-mono text-on-surface-variant">x</span>
            <div className="text-center">
              <p className="font-mono text-label-sm uppercase truncate mb-1" style={{ color: match.teamBColor }}>
                {match.teamBName}
              </p>
              <p className="display-lg font-display font-bold leading-none" style={{ color: match.teamBColor }}>
                {currentScoreB}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Jogadores (Grid 2 colunas como LiveMatchView) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 max-w-3xl mx-auto">
            <div>
              <div className="space-y-2.5 sm:space-y-3">
                {teamAPlayers.map((p) => (
                  <PlayerCard
                    key={p.userId ?? p.name}
                    player={p}
                    teamColor={match.teamAColor}
                    stats={getStats(p.userId ?? "")}
                    disabled={!isAdmin || saving}
                    onClick={() => handlePlayerClick(p)}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="space-y-2.5 sm:space-y-3">
                {teamBPlayers.map((p) => (
                  <PlayerCard
                    key={p.userId ?? p.name}
                    player={p}
                    teamColor={match.teamBColor}
                    stats={getStats(p.userId ?? "")}
                    disabled={!isAdmin || saving}
                    onClick={() => handlePlayerClick(p)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé fixo com botão Confirmar e Abrir Votação */}
        {isAdmin && (
          <div className="px-4 py-3 border-t border-outline-variant bg-surface-container shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={() => setShowConfirm(true)}
              className="w-full py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <MaterialIcon name="how_to_vote" className="w-4 h-4" />
              {saving ? "Salvando..." : "Confirmar e Abrir Votação"}
            </button>
          </div>
        )}

        {/* Modal de Confirmação */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-high rounded-2xl p-6 max-w-sm w-full border border-outline-variant">
              <MaterialIcon name="how_to_vote" className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-headline-sm font-display text-on-surface text-center mb-2">Abrir Votação?</h3>
              <p className="font-mono text-label-sm text-on-surface-variant text-center mb-6">
                Os jogadores poderão votar nos prêmios da partida por <strong className="text-on-surface">2 horas</strong>. O placar final confirmado será{" "}
                <strong className="text-on-surface">
                  {currentScoreA} x {currentScoreB}
                </strong>
                .
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

        <MatchReviewSheet
          match={match}
          selectedPlayer={selectedPlayer}
          saving={saving}
          isAdmin={isAdmin}
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
      </div>
    </AppShell>
  );
}
