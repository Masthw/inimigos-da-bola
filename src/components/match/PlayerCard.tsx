import { Avatar } from "../ui/Avatar";
import type { MatchPlayer } from "../../hooks/useMatches";

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

interface PlayerStats {
  goals: number;
  assists: number;
  ownGoals: number;
}

interface PlayerCardProps {
  player: MatchPlayer;
  teamColor: string;
  stats: PlayerStats;
  disabled?: boolean;
  onClick: () => void;
}

export function PlayerCard({ player, teamColor, stats, disabled, onClick }: PlayerCardProps) {
  return (
    <button
      key={player.userId ?? player.name}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 transition-colors text-left"
      style={{
        backgroundColor: withAlpha(teamColor, 0.05),
        borderColor: isDarkColor(teamColor) ? "rgba(156,163,175,0.4)" : withAlpha(teamColor, 0.2),
        borderWidth: "1px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isDarkColor(teamColor) ? "rgba(156,163,175,0.6)" : withAlpha(teamColor, 0.5);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isDarkColor(teamColor) ? "rgba(156,163,175,0.4)" : withAlpha(teamColor, 0.2);
      }}
    >
      <Avatar
        src={player.avatarUrl}
        alt={player.name}
        className="w-10 h-10 rounded-full shrink-0"
        style={{ borderColor: isDarkColor(teamColor) ? "rgba(156,163,175,0.5)" : withAlpha(teamColor, 0.3), borderWidth: "2px" }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-label-sm text-on-surface truncate leading-tight">{player.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {stats.goals > 0 && (
            <span className="font-mono text-[10px] font-bold" style={{ color: teamColor }}>
              {stats.goals}G
            </span>
          )}
          {stats.assists > 0 && <span className="font-mono text-[10px] text-on-surface-variant">{stats.assists}A</span>}
          {stats.ownGoals > 0 && <span className="font-mono text-[10px] font-bold text-error">{stats.ownGoals}GC</span>}
        </div>
      </div>
    </button>
  );
}
