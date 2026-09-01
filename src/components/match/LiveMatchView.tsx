import { MaterialIcon } from "../ui/MaterialIcon";
import { Avatar } from "../ui/Avatar";
import { PlayerCard } from "./PlayerCard";
import type { MatchPlayer } from "../../hooks/useMatches";
import { useLiveMatchView } from "../../hooks/useLiveMatchView";

interface LiveMatchViewProps {
  matchId: string;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamAScore: number;
  teamBScore: number;
  teamAPlayers: MatchPlayer[];
  teamBPlayers: MatchPlayer[];
  onGoalScored: (scorer: MatchPlayer, assist: MatchPlayer | null) => void;
  onOwnGoal: (teamBenefited: string, scorerUserId: string | null, scorerTeam: string | null) => void;
  onRequestReview: () => void;
  onManagePlayers?: () => void;
  isAdmin?: boolean;
  busy?: boolean;
}

export function LiveMatchView({
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  teamAScore,
  teamBScore,
  teamAPlayers,
  teamBPlayers,
  onGoalScored,
  onOwnGoal,
  onRequestReview,
  onManagePlayers,
  isAdmin,
  busy = false,
}: Readonly<LiveMatchViewProps>) {
  const {
    sheetPhase,
    selectedPlayer,
    getStats,
    assistCandidates,
    sheetOpen,
    handlePlayerClick,
    handleGoal,
    handleOwnGoal,
    handleAssistSelect,
    closeSheet,
  } = useLiveMatchView({
    teamAPlayers,
    teamBPlayers,
    onGoalScored,
    onOwnGoal,
    busy,
  });

  return (
    <div className="h-[calc(100svh-4rem)] flex flex-col bg-surface relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
          <span className="font-mono text-label-bold uppercase tracking-widest text-error">Ao Vivo</span>
        </div>
      </div>

      <div className="px-4 py-5 bg-surface-container-high border-b border-outline-variant shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-w-lg mx-auto">
          <div className="text-center">
            <p className="font-mono text-label-sm uppercase truncate mb-1" style={{ color: teamAColor }}>
              {teamAName}
            </p>
            <p className="display-lg font-display font-bold leading-none" style={{ color: teamAColor }}>
              {teamAScore}
            </p>
          </div>
          <span className="text-headline-md font-mono text-on-surface-variant">x</span>
          <div className="text-center">
            <p className="font-mono text-label-sm uppercase truncate mb-1" style={{ color: teamBColor }}>
              {teamBName}
            </p>
            <p className="display-lg font-display font-bold leading-none" style={{ color: teamBColor }}>
              {teamBScore}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div>
            <div className="space-y-2">
              {teamAPlayers.map((p) => (
                <PlayerCard
                  key={p.userId ?? p.name}
                  player={p}
                  teamColor={teamAColor}
                  stats={getStats(p.userId)}
                  disabled={busy}
                  onClick={() => handlePlayerClick(p)}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="space-y-2">
              {teamBPlayers.map((p) => (
                <PlayerCard
                  key={p.userId ?? p.name}
                  player={p}
                  teamColor={teamBColor}
                  stats={getStats(p.userId)}
                  disabled={busy}
                  onClick={() => handlePlayerClick(p)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-outline-variant bg-surface-container flex gap-3">
        {isAdmin && onManagePlayers && (
          <button
            type="button"
            onClick={onManagePlayers}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary-container text-on-secondary-container font-mono text-label-bold border border-outline-variant active:bg-surface-variant transition-colors"
          >
            <MaterialIcon name="group" className="w-4 h-4" />
            Jogadores
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onRequestReview}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-success/15 text-success font-mono text-label-bold border border-success/30 active:bg-success/25 transition-colors"
        >
          <MaterialIcon name="flag" className="w-4 h-4" />
          Finalizar
        </button>
      </div>

      {sheetOpen && (
        <button type="button" aria-label="Fechar painel" onClick={closeSheet} className="fixed inset-0 bg-black/50 z-40 cursor-default" />
      )}

      <dialog
        open={sheetOpen}
        aria-label="Registrar evento da partida"
        className={`fixed bottom-0 left-0 right-0 z-50 bg-surface-container-high rounded-t-2xl border-t border-outline-variant transition-transform duration-300 ease-out m-0 max-w-none w-full p-0 border-none ${
          sheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        <div className="px-5 pb-8 max-h-[70vh] overflow-y-auto">
          {sheetPhase === "goal_type" && selectedPlayer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={selectedPlayer.avatarUrl} alt={selectedPlayer.name} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-mono text-label-bold text-on-surface">{selectedPlayer.name}</p>
                  <p className="font-mono text-label-sm" style={{ color: selectedPlayer.team === "A" ? teamAColor : teamBColor }}>
                    {selectedPlayer.team === "A" ? teamAName : teamBName}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGoal}
                  className="flex flex-col items-center gap-2 py-5 bg-primary-container text-primary font-mono text-label-bold border border-primary/30 active:bg-primary/20 transition-colors"
                >
                  <MaterialIcon name="sports_soccer" className="w-6 h-6" />
                  Gol
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleOwnGoal}
                  className="flex flex-col items-center gap-2 py-5 bg-warning/15 text-warning font-mono text-label-bold border border-warning/30 active:bg-warning/25 transition-colors"
                >
                  <MaterialIcon name="error" className="w-6 h-6" />
                  Gol Contra
                </button>
              </div>
            </div>
          )}

          {sheetPhase === "assist" && selectedPlayer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={selectedPlayer.avatarUrl} alt={selectedPlayer.name} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-mono text-label-bold text-on-surface">Gol do {selectedPlayer.name}!</p>
                  <p className="font-mono text-label-sm text-on-surface-variant">Quem deu a assistência?</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAssistSelect(null)}
                  className="w-full py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
                >
                  Sem assistência
                </button>
                {assistCandidates.map((p) => (
                  <button
                    key={p.userId}
                    type="button"
                    disabled={busy}
                    onClick={() => handleAssistSelect(p)}
                    className="w-full flex items-center gap-3 py-3 px-4 bg-surface-variant border border-outline-variant active:bg-surface-container-high transition-colors"
                  >
                    <Avatar src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-full" />
                    <span className="font-mono text-label-sm text-on-surface">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
