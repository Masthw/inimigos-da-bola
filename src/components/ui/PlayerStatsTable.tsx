import { memo } from "react";
import { Link } from "react-router-dom";
import { MaterialIcon } from "./MaterialIcon";
import { getAwardMeta } from "../../lib/awards";
import { formatShortName } from "../../lib/profile";

export interface PlayerStats {
  userId?: string | null;
  name: string;
  goals: number;
  assists: number;
  ownGoals?: number;
  awards: string[];
}

export const PlayerStatsTable = memo(function PlayerStatsTable({
  title,
  players,
}: Readonly<{ title: string; players: PlayerStats[] }>) {
  const hasOwnGoals = players.some((p) => (p.ownGoals ?? 0) > 0);

  return (
    <div>
      <p className="font-mono text-label-sm uppercase text-on-surface mb-2">{title}</p>
      <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-on-surface">Jogador</th>
              <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-on-surface">G</th>
              <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-on-surface">A</th>
              {hasOwnGoals && (
                <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-error">GC</th>
              )}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={`${player.userId ?? player.name}-${title}`} className="border-t border-outline-variant/20">
                <td className="px-3 py-2 font-mono text-label-sm text-on-surface whitespace-nowrap">
                  {player.userId ? (
                    <Link
                      to={`/profile/${player.userId}`}
                      title={player.name}
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {formatShortName(player.name)}
                    </Link>
                  ) : (
                    <span title={player.name}>{formatShortName(player.name)}</span>
                  )}
                </td>
                <td className="px-2 py-2 text-center font-mono text-label-sm text-on-surface">{player.goals}</td>
                <td className="px-2 py-2 text-center font-mono text-label-sm text-on-surface">{player.assists}</td>
                {hasOwnGoals && (
                  <td className="px-2 py-2 text-center font-mono text-label-sm text-error">{player.ownGoals ?? 0}</td>
                )}
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {player.awards.map((award) => {
                      const meta = getAwardMeta(award);
                      return (
                        <span key={award} title={award} className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${meta.chip}`}>
                          <MaterialIcon name={meta.icon} className="w-3.5 h-3.5" />
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
