import { useState } from "react";
import { MaterialIcon } from "../ui/MaterialIcon";
import { Avatar } from "../ui/Avatar";
import type { MatchPlayer } from "../../hooks/useMatches";

interface LiveMatchViewProps {
  /** Identificador da partida — disponível para o pai (logs/navegação); o componente não usa diretamente. */
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
  onFinish: (scoreA: number, scoreB: number) => void;
  onRequestReview: () => void;
  busy?: boolean;
}

type SheetPhase = "closed" | "goal_type" | "assist" | "finish";

interface PlayerStats {
  [userId: string]: { goals: number; assists: number; ownGoals: number };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: Number.parseInt(result[1], 16), g: Number.parseInt(result[2], 16), b: Number.parseInt(result[3], 16) } : null;
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function isDarkColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance <= 0.25;
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
  onFinish,
  onRequestReview,
  busy = false,
}: Readonly<LiveMatchViewProps>) {
  const [sheetPhase, setSheetPhase] = useState<SheetPhase>("closed");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);
  const [editScore, setEditScore] = useState({ teamA: teamAScore, teamB: teamBScore });
  const [playerStats, setPlayerStats] = useState<PlayerStats>({});

  const getStats = (userId: string | null) => {
    if (!userId) return { goals: 0, assists: 0, ownGoals: 0 };
    return playerStats[userId] || { goals: 0, assists: 0, ownGoals: 0 };
  };

  const updateStats = (scorerId: string | null, assistId: string | null) => {
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
  };

  const updateOwnGoalStats = (playerId: string | null) => {
    setPlayerStats((prev) => {
      const next = { ...prev };
      if (playerId) {
        next[playerId] = { goals: next[playerId]?.goals || 0, assists: next[playerId]?.assists || 0, ownGoals: (next[playerId]?.ownGoals || 0) + 1 };
      }
      return next;
    });
  };

  const handlePlayerClick = (player: MatchPlayer) => {
    if (busy) return;
    setSelectedPlayer(player);
    setSheetPhase("goal_type");
  };

  const handleGoal = () => {
    setSheetPhase("assist");
  };

  const handleOwnGoal = () => {
    if (!selectedPlayer) return;
    const teamBenefited = selectedPlayer.team === "A" ? "B" : "A";
    updateOwnGoalStats(selectedPlayer.userId);
    onOwnGoal(teamBenefited, selectedPlayer.userId, selectedPlayer.team);
    closeSheet();
  };

  const handleAssistSelect = (assist: MatchPlayer | null) => {
    if (!selectedPlayer) return;
    updateStats(selectedPlayer.userId, assist?.userId || null);
    onGoalScored(selectedPlayer, assist);
    closeSheet();
  };

  const handleFinishConfirm = () => {
    onFinish(editScore.teamA, editScore.teamB);
    closeSheet();
  };

  const closeSheet = () => {
    setSheetPhase("closed");
    setSelectedPlayer(null);
    setEditScore({ teamA: teamAScore, teamB: teamBScore });
  };

  const sameTeamPlayers = selectedPlayer?.team === "A" ? teamAPlayers : teamBPlayers;
  const assistCandidates = sameTeamPlayers.filter((p) => p.userId && p.userId !== selectedPlayer?.userId);

  const sheetOpen = sheetPhase !== "closed";

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
              {teamAPlayers.map((p) => {
                const stats = getStats(p.userId);
                return (
                  <button
                    key={p.userId ?? p.name}
                    type="button"
                    disabled={busy}
                    onClick={() => handlePlayerClick(p)}
                    className="w-full flex items-center gap-3 p-3 transition-colors text-left"
                    style={{
                      backgroundColor: withAlpha(teamAColor, 0.05),
                      borderColor: isDarkColor(teamAColor) ? "rgba(156,163,175,0.4)" : withAlpha(teamAColor, 0.2),
                      borderWidth: "1px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isDarkColor(teamAColor) ? "rgba(156,163,175,0.6)" : withAlpha(teamAColor, 0.5);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDarkColor(teamAColor) ? "rgba(156,163,175,0.4)" : withAlpha(teamAColor, 0.2);
                    }}
                  >
                    <Avatar
                      src={p.avatarUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{ borderColor: isDarkColor(teamAColor) ? "rgba(156,163,175,0.5)" : withAlpha(teamAColor, 0.3), borderWidth: "2px" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-label-sm text-on-surface truncate leading-tight">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {stats.goals > 0 && (
                          <span className="font-mono text-[10px] font-bold" style={{ color: teamAColor }}>
                            {stats.goals}G
                          </span>
                        )}
                        {stats.assists > 0 && <span className="font-mono text-[10px] text-on-surface-variant">{stats.assists}A</span>}
                        {stats.ownGoals > 0 && <span className="font-mono text-[10px] font-bold text-error">{stats.ownGoals}GC</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="space-y-2">
              {teamBPlayers.map((p) => {
                const stats = getStats(p.userId);
                return (
                  <button
                    key={p.userId ?? p.name}
                    type="button"
                    disabled={busy}
                    onClick={() => handlePlayerClick(p)}
                    className="w-full flex items-center gap-3 p-3 transition-colors text-left"
                    style={{
                      backgroundColor: withAlpha(teamBColor, 0.05),
                      borderColor: isDarkColor(teamBColor) ? "rgba(156,163,175,0.4)" : withAlpha(teamBColor, 0.2),
                      borderWidth: "1px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isDarkColor(teamBColor) ? "rgba(156,163,175,0.6)" : withAlpha(teamBColor, 0.5);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDarkColor(teamBColor) ? "rgba(156,163,175,0.4)" : withAlpha(teamBColor, 0.2);
                    }}
                  >
                    <Avatar
                      src={p.avatarUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{ borderColor: isDarkColor(teamBColor) ? "rgba(156,163,175,0.5)" : withAlpha(teamBColor, 0.3), borderWidth: "2px" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-label-sm text-on-surface truncate leading-tight">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {stats.goals > 0 && (
                          <span className="font-mono text-[10px] font-bold" style={{ color: teamBColor }}>
                            {stats.goals}G
                          </span>
                        )}
                        {stats.assists > 0 && <span className="font-mono text-[10px] text-on-surface-variant">{stats.assists}A</span>}
                        {stats.ownGoals > 0 && <span className="font-mono text-[10px] font-bold text-error">{stats.ownGoals}GC</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-outline-variant bg-surface-container flex gap-3">
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
                  <p className="font-mono text-label-bold" style={{ color: selectedPlayer.team === "A" ? teamAColor : teamBColor }}>
                    Gol do {selectedPlayer.name}!
                  </p>
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

          {sheetPhase === "finish" && (
            <div className="space-y-4">
              <p className="font-mono text-label-bold text-on-surface">Placar final</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div>
                  <label className="block font-mono text-label-sm uppercase mb-2 text-center" style={{ color: teamAColor }}>
                    {teamAName}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editScore.teamA}
                    onChange={(e) => setEditScore((prev) => ({ ...prev, teamA: Number(e.target.value) }))}
                    className="w-full bg-surface-variant border border-outline-variant px-3 py-3 font-display text-headline-md text-on-surface text-center appearance-none"
                  />
                </div>
                <span className="font-mono text-label-bold text-on-surface-variant pt-6">x</span>
                <div>
                  <label className="block font-mono text-label-sm uppercase mb-2 text-center" style={{ color: teamBColor }}>
                    {teamBName}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editScore.teamB}
                    onChange={(e) => setEditScore((prev) => ({ ...prev, teamB: Number(e.target.value) }))}
                    className="w-full bg-surface-variant border border-outline-variant px-3 py-3 font-display text-headline-md text-on-surface text-center appearance-none"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleFinishConfirm}
                className="w-full py-3 bg-success text-white font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
              >
                {busy ? "Finalizando..." : "Finalizar Partida"}
              </button>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
