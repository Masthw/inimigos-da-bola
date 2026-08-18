import { useState } from "react";
import { MaterialIcon } from "../ui/MaterialIcon";
import { Avatar } from "../ui/Avatar";
import type { MatchPlayer } from "../../hooks/useMatches";

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
  onOwnGoal: (teamBenefited: string) => void;
  onFinish: (scoreA: number, scoreB: number) => void;
  busy?: boolean;
}

type SheetPhase = "closed" | "goal_type" | "assist" | "finish";

interface PlayerStats {
  [userId: string]: { goals: number; assists: number };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function LiveMatchView({
  matchId,
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
  busy = false,
}: Readonly<LiveMatchViewProps>) {
  const [sheetPhase, setSheetPhase] = useState<SheetPhase>("closed");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);
  const [editScore, setEditScore] = useState({ teamA: teamAScore, teamB: teamBScore });
  const [playerStats, setPlayerStats] = useState<PlayerStats>({});

  const getStats = (userId: string | null) => {
    if (!userId) return { goals: 0, assists: 0 };
    return playerStats[userId] || { goals: 0, assists: 0 };
  };

  const updateStats = (scorerId: string | null, assistId: string | null) => {
    setPlayerStats((prev) => {
      const next = { ...prev };
      if (scorerId) {
        next[scorerId] = { goals: (next[scorerId]?.goals || 0) + 1, assists: next[scorerId]?.assists || 0 };
      }
      if (assistId) {
        next[assistId] = { goals: next[assistId]?.goals || 0, assists: (next[assistId]?.assists || 0) + 1 };
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
    onOwnGoal(teamBenefited);
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
          <span className="font-mono text-label-bold uppercase tracking-widest text-error">Ao Vivo</span>
        </div>
      </div>

      {/* Scoreboard */}
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

      {/* Player lists */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-3 h-5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: teamAColor }} />
              <p className="font-mono text-label-bold uppercase tracking-widest truncate" style={{ color: teamAColor }}>
                {teamAName}
              </p>
            </div>
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
                      borderColor: withAlpha(teamAColor, 0.2),
                      borderWidth: "1px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = withAlpha(teamAColor, 0.5);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = withAlpha(teamAColor, 0.2);
                    }}
                  >
                    <Avatar
                      src={p.avatarUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{ borderColor: withAlpha(teamAColor, 0.3), borderWidth: "2px" }}
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
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3 h-5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: teamBColor }} />
              <p className="font-mono text-label-bold uppercase tracking-widest truncate" style={{ color: teamBColor }}>
                {teamBName}
              </p>
            </div>
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
                      borderColor: withAlpha(teamBColor, 0.2),
                      borderWidth: "1px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = withAlpha(teamBColor, 0.5);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = withAlpha(teamBColor, 0.2);
                    }}
                  >
                    <Avatar
                      src={p.avatarUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{ borderColor: withAlpha(teamBColor, 0.3), borderWidth: "2px" }}
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
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-outline-variant bg-surface-container flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setEditScore({ teamA: teamAScore, teamB: teamBScore });
            setSheetPhase("finish");
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-success/15 text-success font-mono text-label-bold border border-success/30 active:bg-success/25 transition-colors"
        >
          <MaterialIcon name="flag" className="w-4 h-4" />
          Finalizar
        </button>
      </div>

      {/* Backdrop */}
      {sheetOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={closeSheet} />}

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-surface-container-high rounded-t-2xl border-t border-outline-variant transition-transform duration-300 ease-out ${
          sheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        <div className="px-5 pb-8 max-h-[70vh] overflow-y-auto">
          {/* Goal Type Selection */}
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

          {/* Assist Selection */}
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

          {/* Finish Match */}
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
      </div>
    </div>
  );
}
