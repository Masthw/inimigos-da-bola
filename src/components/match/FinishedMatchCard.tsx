import React from "react";
import { MaterialIcon } from "../ui/MaterialIcon";
import { PlayerStatsTable } from "../ui/PlayerStatsTable";

interface FinishedMatchCardProps {
  matchId: string;
  dateTime: string;
  gameTypeName: string | null;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  teamAPlayers: { name: string; goals: number; assists: number; awards: string[] }[];
  teamBPlayers: { name: string; goals: number; assists: number; awards: string[] }[];
  expanded: boolean;
  onToggle: () => void;
}

const OUTCOMEClasses = {
  victory: { chip: "bg-success text-white", score: "text-success" },
  defeat: { chip: "bg-danger text-white", score: "text-danger" },
  draw: { chip: "bg-slate-500 text-white", score: "text-on-surface" },
} as const;

function getOutcome(homeScore: number, awayScore: number): "victory" | "defeat" | "draw" {
  if (homeScore === awayScore) return "draw";
  return homeScore > awayScore ? "victory" : "defeat";
}

const OUTCOME_LABELS: Record<string, string> = {
  victory: "Vitória",
  defeat: "Derrota",
  draw: "Empate",
};

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export const FinishedMatchCard = React.memo(function FinishedMatchCard({
  dateTime,
  gameTypeName,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  teamAPlayers,
  teamBPlayers,
  expanded,
  onToggle,
}: Readonly<FinishedMatchCardProps>) {
  const outcome = getOutcome(teamAScore, teamBScore);
  const outcomeMeta = OUTCOMEClasses[outcome];

  return (
    <div className="bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant rounded-xl p-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left cursor-pointer select-none appearance-none bg-transparent border-none p-0 outline-none block"
      >
        <div className="flex justify-between items-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono text-label-bold uppercase px-2 py-0.5 rounded ${outcomeMeta.chip}`}>
              {OUTCOME_LABELS[outcome]}
            </span>
            {gameTypeName && (
              <span className="text-[10px] font-mono text-label-bold uppercase px-2 py-0.5 rounded bg-surface-container text-on-surface border border-outline-variant/30">
                {gameTypeName}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-label-bold text-on-surface uppercase">{formatShortDate(dateTime)}</span>
        </div>

        <div className="flex items-center gap-4">
          <p className="flex-1 min-w-0 font-body text-on-surface leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {teamAName}{" "}
            <span className={`font-bold ${outcomeMeta.score}`}>
              {teamAScore} — {teamBScore}
            </span>{" "}
            {teamBName}
          </p>

          <MaterialIcon name={expanded ? "expand_less" : "expand_more"} className="w-5 h-5 text-on-surface shrink-0" />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-outline-variant/20 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="bg-surface-container rounded-xl border border-outline-variant p-4 text-center">
              <p className="font-mono text-label-sm text-on-surface uppercase truncate">{teamAName}</p>
              <p className="text-headline-md font-display font-bold text-primary">{teamAScore}</p>
            </div>
            <p className="hidden sm:block text-center font-mono text-label-bold text-on-surface">VS</p>
            <div className="bg-surface-container rounded-xl border border-outline-variant p-4 text-center">
              <p className="font-mono text-label-sm text-on-surface uppercase truncate">{teamBName}</p>
              <p className="text-headline-md font-display font-bold text-on-surface">{teamBScore}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlayerStatsTable title={teamAName} players={teamAPlayers} />
            <PlayerStatsTable title={teamBName} players={teamBPlayers} />
          </div>
        </div>
      )}
    </div>
  );
});
