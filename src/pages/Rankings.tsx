import { useEffect, useState } from "react";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";

interface PlayerRank {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  badges: string[];
  isCurrentUser: boolean;
}

const MOCK_PLAYERS: PlayerRank[] = [
  { id: "p1", name: "Marcus King", avatarUrl: null, points: 34, matchesPlayed: 12, wins: 8, draws: 2, losses: 2, goals: 18, assists: 7, badges: ["Craque", "Goleador", "Líder"], isCurrentUser: false },
  { id: "p2", name: "Bruno Silva", avatarUrl: null, points: 29, matchesPlayed: 12, wins: 7, draws: 3, losses: 2, goals: 5, assists: 9, badges: ["Garçom", "Fair Play"], isCurrentUser: false },
  { id: "p3", name: "Felipe Costa", avatarUrl: null, points: 24, matchesPlayed: 10, wins: 6, draws: 2, losses: 2, goals: 14, assists: 4, badges: ["Craque", "Goleador"], isCurrentUser: false },
  { id: "p4", name: "Lucas Mendes", avatarUrl: null, points: 21, matchesPlayed: 11, wins: 5, draws: 3, losses: 3, goals: 3, assists: 6, badges: ["Defensor"], isCurrentUser: false },
  { id: "p5", name: "Tiago Porto", avatarUrl: null, points: 19, matchesPlayed: 9, wins: 4, draws: 2, losses: 3, goals: 8, assists: 2, badges: ["Goleador", "Destaque"], isCurrentUser: false },
  { id: "p6", name: "André Santos", avatarUrl: null, points: 16, matchesPlayed: 8, wins: 3, draws: 2, losses: 3, goals: 2, assists: 5, badges: ["Garçom"], isCurrentUser: false },
  { id: "p7", name: "Rodrigo Gomes", avatarUrl: null, points: 14, matchesPlayed: 7, wins: 2, draws: 1, losses: 4, goals: 1, assists: 3, badges: ["Fair Play"], isCurrentUser: false },
  { id: "p8", name: "Pedro Lima", avatarUrl: null, points: 11, matchesPlayed: 6, wins: 1, draws: 2, losses: 3, goals: 0, assists: 2, badges: ["Destaque"], isCurrentUser: false },
  { id: "p9", name: "Você", avatarUrl: null, points: 27, matchesPlayed: 11, wins: 7, draws: 2, losses: 2, goals: 12, assists: 5, badges: ["Craque", "Garçom", "Líder"], isCurrentUser: true },
];

export default function Rankings() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    if (useMock) {
      setEntries(MOCK_PLAYERS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let loadingTimer: number | undefined;

    async function load() {
      loadingTimer = window.setTimeout(() => setLoading(true), 0);

      const [{ data: users }, { data: leaderboard }, { data: matchPlayers }, { data: awards }] = await Promise.all([
        supabase.from("users").select("id, name, avatar_url").is("deleted_at", null),
        supabase.from("season_leaderboards").select("*"),
        supabase
          .from("match_players")
          .select("user_id, goals_scored, assists, matches!inner(status, team_a_score, team_b_score, date_time)")
          .eq("matches.status", "finished")
          .is("matches.deleted_at", null),
        supabase.from("match_awards").select("user_id, awards(name)"),
      ]);

      if (cancelled) return;

      const statsMap = new Map<string, { goals: number; assists: number; matchesPlayed: number; wins: number; draws: number; losses: number }>();

      for (const row of matchPlayers ?? []) {
        const uid = row.user_id;
        if (!uid) continue;
        const current = statsMap.get(uid) ?? { goals: 0, assists: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0 };
        current.goals += row.goals_scored ?? 0;
        current.assists += row.assists ?? 0;
        current.matchesPlayed += 1;

        const match = row.matches;
        if (match && match.team_a_score !== null && match.team_b_score !== null) {
          const teamAWon = match.team_a_score > match.team_b_score;
          const isDraw = match.team_a_score === match.team_b_score;
          if (isDraw) {
            current.draws += 1;
          } else if (teamAWon) {
            current.wins += 1;
          } else {
            current.losses += 1;
          }
        }

        statsMap.set(uid, current);
      }

      const badgesMap = new Map<string, string[]>();
      for (const row of awards ?? []) {
        const name = row.awards?.name;
        if (!name || !row.user_id) continue;
        const list = badgesMap.get(row.user_id) ?? [];
        list.push(name);
        badgesMap.set(row.user_id, list);
      }

      const pointsMap = new Map<string, number>();
      const matchesPlayedMap = new Map<string, number>();
      const winsMap = new Map<string, number>();
      const drawsMap = new Map<string, number>();
      const lossesMap = new Map<string, number>();

      for (const row of leaderboard ?? []) {
        pointsMap.set(row.user_id, row.points ?? 0);
        matchesPlayedMap.set(row.user_id, row.matches_played ?? 0);
        winsMap.set(row.user_id, row.wins ?? 0);
        drawsMap.set(row.user_id, row.draws ?? 0);
        lossesMap.set(row.user_id, row.losses ?? 0);
      }

      const result: PlayerRank[] = (users ?? [])
        .map((u) => {
          const stats = statsMap.get(u.id) ?? { goals: 0, assists: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0 };
          const allBadges = badgesMap.get(u.id) ?? [];
          const uniqueBadges = Array.from(new Set(allBadges));

          return {
            id: u.id,
            name: u.name ?? "Jogador",
            avatarUrl: u.avatar_url,
            points: pointsMap.get(u.id) ?? 0,
            matchesPlayed: matchesPlayedMap.get(u.id) ?? stats.matchesPlayed,
            wins: winsMap.get(u.id) ?? stats.wins,
            draws: drawsMap.get(u.id) ?? stats.draws,
            losses: lossesMap.get(u.id) ?? stats.losses,
            goals: stats.goals,
            assists: stats.assists,
            badges: uniqueBadges,
            isCurrentUser: u.id === user?.id,
          };
        })
        .filter((p) => p.matchesPlayed > 0 || p.points > 0)
        .sort((a, b) => b.points - a.points || b.goals - a.goals || b.assists - a.assists);

      if (!cancelled) {
        setEntries(result);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (loadingTimer) window.clearTimeout(loadingTimer);
    };
  }, [user, useMock]);

  const getPositionColor = (pos: number) => {
    if (pos === 1) return "border-tertiary/60";
    if (pos === 2) return "border-secondary/60";
    if (pos === 3) return "border-outline-variant";
    return "border-outline-variant/30";
  };

  const getPositionBadge = (pos: number) => {
    if (pos === 1) return { label: "LEADER", className: "bg-tertiary text-on-tertiary" };
    if (pos === 2) return { label: "RANK #2", className: "bg-secondary text-on-secondary" };
    if (pos === 3) return { label: "RANK #3", className: "bg-outline-variant text-on-surface" };
    return { label: `#${pos}`, className: "bg-primary text-on-primary" };
  };

  const getRankAccent = (pos: number) => {
    if (pos === 1) return "from-tertiary/20 to-transparent";
    if (pos === 2) return "from-secondary/20 to-transparent";
    if (pos === 3) return "from-outline-variant/30 to-transparent";
    return "from-surface-variant/10 to-transparent";
  };

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 shrink-0 border-b border-outline-variant gap-4">
          <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">Rankings & Estatísticas</h2>
          <button
            type="button"
            onClick={() => setUseMock((v) => !v)}
            className="px-3 py-1.5 bg-surface-variant text-on-surface font-mono text-[10px] border border-outline-variant active:bg-surface-container-high transition-colors rounded-lg"
          >
            {useMock ? "Dados Reais" : "Mock"}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-margin-desktop py-6">
          <div className="max-w-5xl mx-auto">
            {!loading && entries.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
                {entries.slice(0, 3).map((player, index) => {
                  const pos = index + 1;
                  const badge = getPositionBadge(pos);
                  const accent = getRankAccent(pos);
                  return (
                    <div
                      key={player.id}
                      className={`${getPositionColor(pos)} p-stack-md rounded-xl border flex flex-col justify-between h-48 relative overflow-hidden group ${
                        pos === 1 ? "md:order-2 md:h-56 shadow-2xl shadow-tertiary/10" : ""
                      } ${pos === 2 ? "md:order-1" : ""} ${pos === 3 ? "md:order-3" : ""}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />

                      <div className="absolute top-[-30px] right-[-20px] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity pointer-events-none">
                        <span className="font-display-lg text-[140px] leading-none font-black text-on-background">
                          #{pos}
                        </span>
                      </div>

                      <div className="relative z-10">
                        <div className="flex justify-between items-start">
                          <span className={`px-3 py-1 text-label-bold rounded-sm ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant border-2 border-transparent group-hover:border-primary/50 transition-all shrink-0">
                            {player.avatarUrl ? (
                              <img className="w-full h-full object-cover" src={player.avatarUrl} alt={player.name} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                                <MaterialIcon name="person" className="w-6 h-6 text-on-surface-variant" />
                              </div>
                            )}
                          </div>
                          <h3 className="font-display-lg text-headline-lg truncate">{player.name}</h3>
                        </div>
                      </div>

                      <div className="relative z-10 flex gap-4 border-t border-outline-variant/20 pt-2">
                        <div>
                          <p className="text-label-sm opacity-60">GP</p>
                          <p className="font-label-bold text-primary">{player.matchesPlayed}</p>
                        </div>
                        <div>
                          <p className="text-label-sm opacity-60">G</p>
                          <p className="font-label-bold text-primary">{player.goals}</p>
                        </div>
                        <div>
                          <p className="text-label-sm opacity-60">A</p>
                          <p className="font-label-bold text-secondary">{player.assists}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Main Ranking Table */}
            <section className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/20 shadow-xl">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 bg-surface-variant animate-pulse rounded-lg w-full" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="p-8 text-center">
                  <MaterialIcon name="sports_soccer" className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-40" />
                  <p className="font-body-lg text-on-surface mb-2">Nenhuma estatística disponível</p>
                  <p className="font-body-md text-on-surface-variant">Os rankings serão atualizados após a primeira partida finalizada.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-surface-container-high border-b border-outline-variant">
                        <tr>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider w-16 text-center">#</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider">Jogador</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider text-center">GP</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider text-center">G</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider text-center">A</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider text-center">V</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider text-center">D</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider text-center">E</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider">Badges</th>
                          <th className="px-4 py-3 font-label-bold text-label-sm text-on-surface-variant uppercase tracking-wider text-right">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {entries.map((player, index) => {
                          const rank = index + 1;
                          const isCurrent = player.isCurrentUser;

                          return (
                            <tr
                              key={player.id}
                              className={`hover:bg-surface-container-highest/50 transition-colors group ${isCurrent ? "bg-primary-container/5" : ""}`}
                            >
                              <td className="px-4 py-3 font-label-bold text-center text-primary">
                                {rank.toString().padStart(2, "0")}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-variant border-2 border-transparent group-hover:border-primary/50 transition-all shrink-0">
                                    {player.avatarUrl ? (
                                      <img className="w-full h-full object-cover" src={player.avatarUrl} alt={player.name} referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                                        <MaterialIcon name="person" className="w-5 h-5 text-on-surface-variant" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-label-bold truncate">{player.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-label-bold">{player.matchesPlayed}</td>
                              <td className="px-4 py-3 text-center font-label-bold text-primary">{player.goals}</td>
                              <td className="px-4 py-3 text-center font-label-bold text-secondary">{player.assists}</td>
                              <td className="px-4 py-3 text-center font-label-bold text-on-surface">{player.wins}</td>
                              <td className="px-4 py-3 text-center font-label-bold text-on-surface">{player.draws}</td>
                              <td className="px-4 py-3 text-center font-label-bold text-on-surface-variant">{player.losses}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 flex-wrap">
                                  {player.badges.slice(0, 3).map((badge) => (
                                    <MaterialIcon key={badge} name="stars" className="text-tertiary-fixed-dim text-sm" title={badge} />
                                  ))}
                                  {player.badges.length > 3 && (
                                    <span className="text-[10px] text-on-surface-variant font-mono">+{player.badges.length - 3}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-label-bold ${isCurrent ? "text-tertiary" : "text-on-surface-variant"}`}>{player.points}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
