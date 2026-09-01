import { MaterialIcon } from "../ui/MaterialIcon";
import { Avatar } from "../ui/Avatar";
import type { MatchReviewData } from "../../hooks/useMatchReview";
import type { MatchPlayer } from "../../hooks/useMatches";

interface MatchReviewSheetProps {
  match: MatchReviewData;
  selectedPlayer: MatchPlayer | null;
  saving: boolean;
  isAdmin: boolean;
  sheetPhase: "closed" | "goal_type" | "assist" | "manage";
  assistCandidates: MatchPlayer[];
  onClose: () => void;
  onGoal: () => void;
  onOwnGoal: () => void;
  onAddAssistOnly: () => void;
  onRemoveGoal: () => void;
  onRemoveAssist: () => void;
  onRemoveOwnGoal: () => void;
  onAssistSelect: (player: MatchPlayer | null) => void;
}

export function MatchReviewSheet({
  match,
  selectedPlayer,
  saving,
  isAdmin,
  sheetPhase,
  assistCandidates,
  onClose,
  onGoal,
  onOwnGoal,
  onAddAssistOnly,
  onRemoveGoal,
  onRemoveAssist,
  onRemoveOwnGoal,
  onAssistSelect,
}: MatchReviewSheetProps) {
  if (!selectedPlayer) return null;

  const goalCount = match.goals.filter((g: { playerId: string }) => g.playerId === selectedPlayer.userId).length;
  const assistCount = match.assists.filter((a: { assistPlayerId: string }) => a.assistPlayerId === selectedPlayer.userId).length;
  const ownGoalCount = match.ownGoals.filter((og: { playerId: string }) => og.playerId === selectedPlayer.userId).length;
  const hasAny = goalCount > 0 || assistCount > 0 || ownGoalCount > 0;

  return (
    <>
      <button
        type="button"
        aria-label="Fechar painel"
        className="fixed inset-0 w-full h-full bg-black/50 z-40 cursor-default border-none outline-none appearance-none"
        onClick={onClose}
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-high rounded-t-2xl border-t border-outline-variant transition-transform duration-300 ease-out translate-y-0">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        <div className="px-5 pb-8 max-h-[70vh] overflow-y-auto">
          {(sheetPhase === "manage" || sheetPhase === "goal_type") && (
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
                        disabled={!isAdmin || saving}
                        onClick={onRemoveGoal}
                        className="flex items-center gap-2 px-3 py-2 bg-error/10 text-error font-mono text-label-sm border border-error/20 active:bg-error/20 transition-colors"
                      >
                        <MaterialIcon name="remove_circle" className="w-4 h-4" />
                        {goalCount} {goalCount === 1 ? "Gol" : "Gols"}
                      </button>
                    )}
                    {assistCount > 0 && (
                      <button
                        type="button"
                        disabled={!isAdmin || saving}
                        onClick={onRemoveAssist}
                        className="flex items-center gap-2 px-3 py-2 bg-error/10 text-error font-mono text-label-sm border border-error/20 active:bg-error/20 transition-colors"
                      >
                        <MaterialIcon name="remove_circle" className="w-4 h-4" />
                        {assistCount} {assistCount === 1 ? "Assist." : "Assists."}
                      </button>
                    )}
                    {ownGoalCount > 0 && (
                      <button
                        type="button"
                        disabled={!isAdmin || saving}
                        onClick={onRemoveOwnGoal}
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
                    disabled={!isAdmin || saving}
                    onClick={onGoal}
                    className="flex flex-col items-center gap-2 py-4 bg-primary-container text-primary font-mono text-label-bold border border-primary/30 active:bg-primary/20 transition-colors"
                  >
                    <MaterialIcon name="sports_soccer" className="w-6 h-6" />
                    Gol
                  </button>
                  <button
                    type="button"
                    disabled={!isAdmin || saving}
                    onClick={onOwnGoal}
                    className="flex flex-col items-center gap-2 py-4 bg-warning/15 text-warning font-mono text-label-bold border border-warning/30 active:bg-warning/25 transition-colors"
                  >
                    <MaterialIcon name="error" className="w-6 h-6" />
                    Gol Contra
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin || saving}
                  onClick={onAddAssistOnly}
                  className="w-full flex flex-col items-center gap-2 py-4 bg-secondary-container text-secondary font-mono text-label-bold border border-secondary/30 active:bg-secondary/20 transition-colors"
                >
                  <MaterialIcon name="send" className="w-6 h-6" />
                  Assistência
                </button>
              </div>
            </div>
          )}

          {sheetPhase === "assist" && (
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
                  onClick={() => onAssistSelect(null)}
                  className="w-full py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
                >
                  Sem assistência
                </button>
                {assistCandidates.map((p) => (
                  <button
                    key={p.userId}
                    type="button"
                    disabled={saving}
                    onClick={() => onAssistSelect(p)}
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
    </>
  );
}
