import { memo } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { getAwardMeta } from "../../lib/awards";

interface PlayerStats {
  name: string;
  goals: number;
  assists: number;
  awards: string[];
}

export const PlayerStatsTable = memo(function PlayerStatsTable({
  title,
  players,
}: Readonly<{ title: string; players: PlayerStats[] }>) {
  return (
    <div>
      <p className="font-mono text-label-sm uppercase text-on-surface mb-2">{title}</p>
      <div className="overflow-hidden rounded-xl border border-outline-variant/30">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-on-surface">Jogador</th>
              <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-on-surface">G</th>
              <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-on-surface">A</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={`${player.name}-${title}`} className="border-t border-outline-variant/20">
                <td className="px-3 py-2 font-mono text-label-sm text-on-surface whitespace-nowrap">{player.name}</td>
                <td className="px-2 py-2 text-center font-mono text-label-sm text-on-surface">{player.goals}</td>
                <td className="px-2 py-2 text-center font-mono text-label-sm text-on-surface">{player.assists}</td>
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
