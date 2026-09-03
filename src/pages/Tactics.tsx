import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { Skeleton, SkeletonPlayerRow } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { useNextMatch } from "../hooks/useNextMatch";
import type { NextMatchData } from "../hooks/useNextMatch";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useLiveMatch } from "../hooks/useLiveMatch";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { supabase, uniqueChannelTopic } from "../lib/supabaseClient";

const POSITIONS_FUTSAL = [
  { id: "pivo", label: "Pivô", short: "PIV", x: 50, y: 22 },
  { id: "ala_e", label: "Ala Esquerdo", short: "ALA", x: 20, y: 45 },
  { id: "ala_d", label: "Ala Direito", short: "ALA", x: 80, y: 45 },
  { id: "fixo", label: "Fixo", short: "FIX", x: 50, y: 70 },
  { id: "gol", label: "Goleiro", short: "GK", x: 50, y: 90 },
] as const;

const POSITIONS_SOCIETY = [
  ...POSITIONS_FUTSAL,
  { id: "meia_e", label: "Meia Esquerdo", short: "MEI", x: 35, y: 38 },
  { id: "meia_d", label: "Meia Direito", short: "MEI", x: 65, y: 38 },
] as const;

type PositionId = (typeof POSITIONS_FUTSAL)[number]["id"] | (typeof POSITIONS_SOCIETY)[number]["id"];

const FUTSAL_IDS = new Set<string>(POSITIONS_FUTSAL.map((p) => p.id));

const SOCIETY_ONLY_ENTRIES: [string, string][] = [];
for (const p of POSITIONS_SOCIETY) {
  if (!FUTSAL_IDS.has(p.id)) SOCIETY_ONLY_ENTRIES.push([p.id, p.label]);
}

const POSITION_LABELS: Record<string, string> = Object.fromEntries([
  ...POSITIONS_FUTSAL.map((p) => [p.id, p.label]),
  ...SOCIETY_ONLY_ENTRIES,
]) as Record<string, string>;

const DB_POSITION_TO_LOCAL: Record<string, PositionId> = {
  Pivô: "pivo",
  "Ala Esquerdo": "ala_e",
  "Ala Esquerda": "ala_e",
  "Ala Esq.": "ala_e",
  "Ala Direito": "ala_d",
  "Ala Direita": "ala_d",
  "Ala Dir.": "ala_d",
  Fixo: "fixo",
  Goleiro: "gol",
  "Meia Esquerdo": "meia_e",
  "Meia Esquerda": "meia_e",
  "Meia Esq.": "meia_e",
  "Meia Direito": "meia_d",
  "Meia Direita": "meia_d",
  "Meia Dir.": "meia_d",
};

const DB_POSITION_CODE_TO_LOCAL: Record<string, PositionId> = {
  GO: "gol",
  FI: "fixo",
  AD: "ala_d",
  AE: "ala_e",
  MD: "meia_d",
  ME: "meia_e",
  PI: "pivo",
};

const LOCAL_TO_DB_POSITION: Record<PositionId, string> = {
  pivo: "Pivô",
  ala_e: "Ala Esquerdo",
  ala_d: "Ala Direito",
  fixo: "Fixo",
  gol: "Goleiro",
  meia_e: "Meia Esquerdo",
  meia_d: "Meia Direito",
};

interface Player {
  id: string;
  name: string;
  initials: string;
  avatar: string | null;
  position: PositionId | null;
  favoritePosition: PositionId | null;
  matchPlayerId: string;
  userId: string | null;
  team: string | null;
}

function nodeClasses(id: PositionId): string {
  if (id === "pivo" || id === "fixo" || id === "meia_e" || id === "meia_d" || id === "ala_e" || id === "ala_d") {
    return "bg-primary-container text-on-primary-container";
  }
  if (id === "gol") {
    return "bg-tertiary-container text-on-tertiary";
  }
  return "bg-surface-container-highest text-on-surface";
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

function TacticalNode({
  short,
  label,
  x,
  y,
  id,
  occupant,
  canSelect,
  onSelect,
}: Readonly<{
  short: string;
  label: string;
  x: number;
  y: number;
  id: PositionId;
  occupant?: Player;
  canSelect: boolean;
  onSelect: () => void;
}>) {
  const isFavorite = !!occupant?.favoritePosition && occupant.position === occupant.favoritePosition;
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <button
            type="button"
            onClick={onSelect}
            disabled={!canSelect}
            aria-label={occupant ? `${label}: ${occupant.name}` : `${label}: disponível`}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center font-mono text-label-bold text-sm shadow-lg transition-transform active:scale-90 overflow-hidden ${
              occupant
                ? `border-2 border-white/30 ${nodeClasses(id)}`
                : "border-2 border-dashed border-white/40 bg-surface-container-highest/50 text-on-surface-variant"
            } ${canSelect ? "cursor-pointer" : "cursor-not-allowed"} ${!occupant ? "hover:border-white/80 hover:text-on-surface" : ""}`}
          >
            {occupant?.avatar ? (
              <img src={occupant.avatar} alt={occupant.name} className="w-full h-full object-cover" />
            ) : occupant ? (
              occupant.initials
            ) : (
              short
            )}
          </button>

          {isFavorite && (
            <span className="absolute -top-1 -right-1 z-10 text-tertiary rounded-full p-0.5 shadow-md">
              <MaterialIcon name="star" className="w-3.5 h-3.5 fill-current" />
            </span>
          )}
        </div>

        <span
          className={`mt-1 font-mono text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${
            occupant ? "text-on-surface bg-surface-container/70" : "text-on-surface-variant/70 bg-surface-container/40"
          }`}
        >
          {occupant ? occupant.name : label}
        </span>
      </div>
    </div>
  );
}

function CourtMarkings({ horizontal }: Readonly<{ horizontal: boolean }>) {
  if (horizontal) {
    return (
      <svg viewBox="0 0 170 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full text-white" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7">
          <rect x="3" y="3" width="164" height="94" rx="1" />
          <line x1="85" y1="3" x2="85" y2="97" />
          <circle cx="85" cy="50" r="14" />
          <circle cx="85" cy="50" r="1.5" fill="currentColor" />
          <rect x="3" y="28" width="26" height="44" />
          <rect x="3" y="38" width="10" height="24" />
          <rect x="141" y="28" width="26" height="44" />
          <rect x="157" y="38" width="10" height="24" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 170" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full text-white" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7">
        <rect x="3" y="3" width="94" height="164" rx="1" />
        <line x1="3" y1="85" x2="97" y2="85" />
        <circle cx="50" cy="85" r="14" />
        <circle cx="50" cy="85" r="1.5" fill="currentColor" />
        <rect x="28" y="3" width="44" height="26" />
        <rect x="38" y="3" width="24" height="10" />
        <rect x="28" y="141" width="44" height="26" />
        <rect x="38" y="157" width="24" height="10" />
      </g>
    </svg>
  );
}

function PlayerRow({ player, isMe }: Readonly<{ player: Player; isMe: boolean }>) {
  return (
    <div
      className={`flex items-center justify-between px-2 py-2 rounded-lg transition-colors hover:bg-surface-variant/40 ${isMe ? "bg-primary-container/10" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {player.avatar ? (
          <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full border border-white/20 shrink-0 object-cover" />
        ) : (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono border border-white/20 shrink-0 ${
              player.position ? nodeClasses(player.position) : "bg-surface-variant text-on-surface-variant"
            }`}
          >
            {player.initials}
          </div>
        )}
        <p className="font-body-md text-on-surface text-sm truncate">
          {player.name}
          {isMe && <span className="ml-1.5 font-mono text-[9px] text-primary uppercase shrink-0">(você)</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant uppercase tracking-wide shrink-0 ml-2">
        {player.position ? (
          <span className="whitespace-nowrap">{POSITION_LABELS[player.position]}</span>
        ) : (
          <span className="whitespace-nowrap">Banco</span>
        )}
      </div>
    </div>
  );
}

function DesktopPlayerRow({ player, isMe }: Readonly<{ player: Player; isMe: boolean }>) {
  return (
    <div
      className={`grid grid-cols-[1fr_120px_90px] items-center gap-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-surface-variant/40 ${isMe ? "bg-primary-container/10" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {player.avatar ? (
          <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full border border-white/20 shrink-0 object-cover" />
        ) : (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono border border-white/20 shrink-0 ${
              player.position ? nodeClasses(player.position) : "bg-surface-variant text-on-surface-variant"
            }`}
          >
            {player.initials}
          </div>
        )}
        <p className="font-body-md text-on-surface text-sm truncate">
          {player.name}
          {isMe && <span className="ml-1.5 font-mono text-[9px] text-primary uppercase">(você)</span>}
        </p>
      </div>
      <span
        className={`justify-self-start font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full truncate ${
          player.position ? "bg-primary-container/20 text-on-surface" : "text-on-surface-variant"
        }`}
      >
        {player.position ? POSITION_LABELS[player.position] : "Banco"}
      </span>
      <span className="flex items-center justify-end gap-1 font-mono text-[10px] text-on-surface-variant uppercase tracking-wide shrink-0">
        <MaterialIcon name="star" className="w-3 h-3 text-tertiary fill-current" />
        <span className="truncate">{player.favoritePosition ? POSITION_LABELS[player.favoritePosition] : "—"}</span>
      </span>
    </div>
  );
}

function TeamList({
  players,
  teamLabel,
  match,
  courtLabel,
  currentUserId,
  unconfirmedMessage,
}: Readonly<{
  players: Player[];
  teamLabel: string;
  match: { opponent: string; date: string; court: string };
  courtLabel: string;
  currentUserId: string | undefined;
  unconfirmedMessage?: string;
}>) {
  const starters = players.filter((p) => p.position !== null);
  const reserves = players.filter((p) => p.position === null);
  const ordered = [...starters, ...reserves];

  return (
    <div className="w-full lg:max-w-none lg:w-105 lg:shrink-0 mt-6 lg:mt-0 self-start bg-surface-container-high rounded-xl border border-outline-variant/30 overflow-hidden">
      <div className="px-3 py-2.5 bg-surface-container-highest/50 border-b border-outline-variant/20">
        <p className="font-mono text-label-sm text-on-surface truncate">{teamLabel}</p>
        <p className="font-mono text-[10px] text-on-surface-variant mt-0.5 truncate">
          {match.date} • {courtLabel}
        </p>
        {unconfirmedMessage && <p className="font-mono text-[10px] text-tertiary mt-1 truncate">{unconfirmedMessage}</p>}
      </div>

      <div className="lg:hidden">
        <div className="px-3 pt-2 pb-1">
          <h5 className="font-mono text-label-bold text-on-surface-variant uppercase text-[10px]">Titulares ({starters.length})</h5>
        </div>
        <div className="p-2 space-y-0.5">
          {starters.length === 0 ? (
            <p className="px-2 py-1.5 font-body-sm text-on-surface-variant text-xs">Ninguém escalado ainda</p>
          ) : (
            starters.map((player) => <PlayerRow key={player.id} player={player} isMe={player.userId === currentUserId} />)
          )}
        </div>
        <div className="border-t border-outline-variant/30">
          <div className="px-3 pt-2 pb-1">
            <h5 className="font-mono text-label-bold text-on-surface-variant uppercase text-[10px]">Reservas ({reserves.length})</h5>
          </div>
          <div className="p-2 pt-0 space-y-0.5">
            {reserves.map((player) => (
              <PlayerRow key={player.id} player={player} isMe={player.userId === currentUserId} />
            ))}
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="grid grid-cols-[1fr_120px_90px] px-3 py-1.5 border-b border-outline-variant/20 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
          <span>Jogador</span>
          <span>Posição</span>
          <span className="text-right">Favorita</span>
        </div>
        <div className="p-1.5 space-y-0.5">
          {ordered.map((player) => (
            <DesktopPlayerRow key={player.id} player={player} isMe={player.userId === currentUserId} />
          ))}
        </div>
      </div>
    </div>
  );
}

// HELPERS DE BUSCA & ESTADO

interface FetchedTeams {
  teamA: Player[];
  teamB: Player[];
  all: Player[];
}

async function fetchMatchData(matchId: string, activePositions: readonly { id: string }[]): Promise<FetchedTeams> {
  const playersRes = await supabase
    .from("match_players")
    .select("id, user_id, guest_name, team, tactical_position, users(name, avatar_url)")
    .eq("match_id", matchId)
    .eq("status", "confirmed");

  if (playersRes.error) {
    throw new Error("Erro ao carregar jogadores");
  }

  const rows = playersRes.data ?? [];
  const playerUserIds = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)));

  let favResData: { user_id: string; positions: { name: string | null; code: string | null } | null }[] = [];
  if (playerUserIds.length > 0) {
    const favRes = await supabase
      .from("user_favorite_positions")
      .select("user_id, position_id, is_primary, positions(name, code)")
      .in("user_id", playerUserIds)
      .order("is_primary", { ascending: false });
    favResData = (favRes.data ?? []) as typeof favResData;
  }

  const favByPlayer = new Map<string, { name: string | null; code: string | null }>();
  for (const row of favResData) {
    if (favByPlayer.has(row.user_id)) continue;
    favByPlayer.set(row.user_id, {
      name: row.positions?.name ?? null,
      code: row.positions?.code ?? null,
    });
  }

  const players: Player[] = rows.map((row) => {
    const fullName = row.users?.name ?? row.guest_name ?? "Convidado";
    const parts = fullName.trim().split(" ").filter(Boolean);
    const initials = parts
      .map((n) => n[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();

    let pos: PositionId | null = null;
    if (row.tactical_position && DB_POSITION_TO_LOCAL[row.tactical_position]) {
      const localId = DB_POSITION_TO_LOCAL[row.tactical_position];
      if (activePositions.some((p) => p.id === localId)) {
        pos = localId;
      }
    }

    let favPos: PositionId | null = null;
    const fav = row.user_id ? favByPlayer.get(row.user_id) : null;
    if (fav) {
      const localByName = fav.name ? DB_POSITION_TO_LOCAL[fav.name] : undefined;
      const localByCode = fav.code ? DB_POSITION_CODE_TO_LOCAL[fav.code.toUpperCase()] : undefined;
      const localId = localByName ?? localByCode ?? null;
      if (localId && activePositions.some((p) => p.id === localId)) {
        favPos = localId;
      }
    }

    return {
      id: row.user_id ?? row.guest_name ?? "unknown",
      name: fullName,
      initials,
      avatar: row.users?.avatar_url ?? null,
      position: pos,
      favoritePosition: favPos,
      matchPlayerId: row.id,
      userId: row.user_id ?? null,
      team: row.team ?? null,
    };
  });

  const teamA = players.filter((p) => p.team === "A");
  const teamB = players.filter((p) => p.team === "B");
  return { teamA, teamB, all: players };
}

function useTacticsBoard(
  nextMatch: NextMatchData | null | undefined,
  currentUserId: string | undefined,
  activePositions: readonly { id: string }[],
  isGroupAdmin: boolean,
  setTacticalPositionFn: (matchPlayerId: string, position: string | null) => Promise<{ error: string | null }>,
) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canAccess = !!nextMatch && (nextMatch.myStatus === "confirmed" || isGroupAdmin);

  const refetch = useCallback(async () => {
    if (!nextMatch || !canAccess) {
      setPlayers([]);
      setTeamA([]);
      setTeamB([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchMatchData(nextMatch.id, activePositions);
      setPlayers(data.all);
      setTeamA(data.teamA);
      setTeamB(data.teamB);
      setError(null);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMatch?.id, activePositions, canAccess]);

  const refetchSilent = useCallback(async () => {
    if (!nextMatch || !canAccess) {
      setPlayers([]);
      setTeamA([]);
      setTeamB([]);
      return;
    }
    try {
      const data = await fetchMatchData(nextMatch.id, activePositions);
      setPlayers(data.all);
      setTeamA(data.teamA);
      setTeamB(data.teamB);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMatch?.id, activePositions, canAccess]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!isMounted) return;
      setLoading(true);
      await refetch();
    })();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMatch?.id, activePositions]);

  useEffect(() => {
    if (!nextMatch) return;
    const channel = supabase
      .channel(uniqueChannelTopic(`tactics-${nextMatch.id}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_players",
          filter: `match_id=eq.${nextMatch.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
            refetchSilent();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMatch?.id, refetchSilent]);

  const selectPosition = useCallback(
    async (playerId: string, posId: PositionId | null) => {
      if (!nextMatch) return;
      const target = players.find((p) => p.id === playerId);
      if (!target) return;

      const isOwn = target.userId === currentUserId;
      if (!isGroupAdmin && !isOwn) return;

      if (posId !== null) {
        const occupiedByOther = players.some((p) => p.position === posId && p.id !== playerId);
        if (occupiedByOther) return;
      }

      const dbName = posId ? LOCAL_TO_DB_POSITION[posId] : null;
      const result = await setTacticalPositionFn(target.matchPlayerId, dbName);
      if (result.error) return;

      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, position: p.position === posId ? null : posId } : p)));
      setTeamA((prev) => prev.map((p) => (p.id === playerId ? { ...p, position: p.position === posId ? null : posId } : p)));
      setTeamB((prev) => prev.map((p) => (p.id === playerId ? { ...p, position: p.position === posId ? null : posId } : p)));
    },
    [nextMatch, players, currentUserId, isGroupAdmin, setTacticalPositionFn],
  );

  return { loading, players, teamA, teamB, error, selectPosition, refetch };
}

// COMPONENTES DE ESTADO DA UI

function TacticsLoading() {
  return (
    <AppShell>
      <div className="min-h-[calc(100svh-4rem)] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-4 w-40" />
        <div className="relative aspect-video bg-surface-container rounded-xl border border-outline-variant">
          <div className="absolute inset-0 flex items-center justify-center">
            <MaterialIcon name="sports_soccer" className="w-12 h-12 text-surface-variant" />
          </div>
        </div>
        <SkeletonPlayerRow count={5} />
      </div>
    </AppShell>
  );
}

function TacticsError({ message }: Readonly<{ message: string }>) {
  return (
    <AppShell>
      <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <MaterialIcon name="error" className="w-10 h-10 text-error mx-auto mb-4" />
          <p className="font-mono text-label-bold text-on-surface">{message}</p>
          <button
            type="button"
            onClick={() => (window.location.href = "/matches")}
            className="mt-4 px-4 py-2 font-mono text-label-sm text-primary hover:bg-surface-variant transition-colors"
          >
            Voltar para partidas
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function TacticsUnconfirmed({ courtType, hasMatch }: Readonly<{ courtType: string; hasMatch: boolean }>) {
  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 shrink-0 border-b border-outline-variant gap-4">
          <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">
            {courtType === "futsal" ? "Quadra de Futsal" : "Quadra Society"}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 px-4 md:px-margin-desktop py-6">
          <div className="text-center p-4">
            <MaterialIcon name="sports_soccer" className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-40" />
            <p className="font-body-lg text-on-surface mb-2">{!hasMatch ? "Nenhuma partida em breve" : "Você ainda não confirmou presença"}</p>
            <p className="font-body-md text-on-surface-variant mb-6">
              {!hasMatch
                ? "Confirme presença em um jogo para visualizar e montar a escalação tática."
                : "Confirme sua presença na próxima partida para montar a escalação."}
            </p>
            <button
              type="button"
              onClick={() => (window.location.href = "/matches")}
              className="px-6 py-3 bg-primary text-on-primary font-mono text-label-bold border border-outline-variant active:bg-primary/80 transition-colors"
            >
              Ver Partidas
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// COMPONENTE PRINCIPAL

interface LayoutPosition {
  id: PositionId;
  short: string;
  label: string;
  x: number;
  y: number;
}

function CourtCard({
  teamPlayers,
  layoutPositions,
  courtImage,
  isDesktop,
  currentUserId,
  isGroupAdmin,
  onSelect,
}: Readonly<{
  teamPlayers: Player[];
  layoutPositions: LayoutPosition[];
  courtImage: string;
  isDesktop: boolean;
  currentUserId: string | undefined;
  isGroupAdmin: boolean;
  onSelect: (playerId: string, posId: PositionId | null) => void;
  teamAName: string;
  teamBName: string;
}>) {
  const hasPlayers = teamPlayers.length > 0;

  return (
    <div className="w-full flex flex-col">
      <div
        className={`relative w-full max-w-85 md:max-w-3xl lg:max-w-none mx-auto lg:mx-0 bg-linear-to-br from-slate-900 to-blue-900 rounded-2xl border-4 border-surface-container-highest overflow-hidden shadow-2xl ${
          isDesktop ? "aspect-[1.7/1]" : "aspect-[1/1.7]"
        }`}
      >
        <img src={courtImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <CourtMarkings horizontal={isDesktop} />
        {layoutPositions.map((pos) => {
          const occupant = hasPlayers ? teamPlayers.find((p) => p.position === pos.id) : undefined;
          const occupantIsMe = hasPlayers && occupant !== undefined && occupant.userId === currentUserId;
          const canEdit = isGroupAdmin || occupantIsMe;
          const canSelect = hasPlayers && (!occupant || canEdit);
          return (
            <TacticalNode
              key={pos.id}
              id={pos.id}
              short={pos.short}
              label={pos.label}
              x={pos.x}
              y={pos.y}
              occupant={occupant}
              canSelect={canSelect}
              onSelect={() => {
                if (occupant) {
                  onSelect(occupant.id, occupant.position === pos.id ? null : pos.id);
                } else if (hasPlayers) {
                  const meOnTeam = teamPlayers.find((p) => p.userId === currentUserId);
                  if (meOnTeam) {
                    onSelect(meOnTeam.id, pos.id);
                  }
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function CourtArea({
  teamA,
  teamB,
  layoutPositions,
  courtImage,
  isDesktop,
  currentUserId,
  isGroupAdmin,
  onSelect,
  teamAName,
  teamBName,
}: Readonly<{
  teamA: Player[];
  teamB: Player[];
  layoutPositions: LayoutPosition[];
  courtImage: string;
  isDesktop: boolean;
  currentUserId: string | undefined;
  isGroupAdmin: boolean;
  onSelect: (playerId: string, posId: PositionId | null) => void;
  teamAName: string;
  teamBName: string;
}>) {
  const hasPlayers = teamA.length > 0 || teamB.length > 0;

  return (
    <div className="w-full lg:flex-1 flex flex-col gap-4">
      {hasPlayers ? (
        <>
          {teamA.length > 0 && (
            <CourtCard
              teamPlayers={teamA}
              layoutPositions={layoutPositions}
              courtImage={courtImage}
              isDesktop={isDesktop}
              currentUserId={currentUserId}
              isGroupAdmin={isGroupAdmin}
              onSelect={onSelect}
              teamAName={teamAName}
              teamBName={teamBName}
            />
          )}
          {teamB.length > 0 && (
            <CourtCard
              teamPlayers={teamB}
              layoutPositions={layoutPositions}
              courtImage={courtImage}
              isDesktop={isDesktop}
              currentUserId={currentUserId}
              isGroupAdmin={isGroupAdmin}
              onSelect={onSelect}
              teamAName={teamAName}
              teamBName={teamBName}
            />
          )}
        </>
      ) : (
        <CourtCard
          teamPlayers={[]}
          layoutPositions={layoutPositions}
          courtImage={courtImage}
          isDesktop={isDesktop}
          currentUserId={currentUserId}
          isGroupAdmin={isGroupAdmin}
          onSelect={onSelect}
          teamAName={teamAName}
          teamBName={teamBName}
        />
      )}
    </div>
  );
}

function SidebarTeams({
  teamA,
  teamB,
  matchInfo,
  courtName,
  currentUserId,
  teamAName,
  teamBName,
}: Readonly<{
  teamA: Player[];
  teamB: Player[];
  matchInfo: { opponent: string; date: string; court: string };
  courtName: string;
  currentUserId: string | undefined;
  teamAName: string;
  teamBName: string;
}>) {
  const teams = [
    { label: teamAName, players: teamA },
    { label: teamBName, players: teamB },
  ].filter((t) => t.players.length > 0);

  return (
    <div className="flex flex-col gap-4 w-full lg:w-105 lg:shrink-0">
      {teams.length > 0 ? (
        teams.map((t) => (
          <TeamList key={t.label} players={t.players} teamLabel={t.label} match={matchInfo} courtLabel={courtName} currentUserId={currentUserId} />
        ))
      ) : (
        <div className="bg-surface-container-high rounded-xl border border-outline-variant/30 p-4">
          <p className="font-mono text-label-sm text-on-surface-variant">Nenhum jogador escalado</p>
        </div>
      )}
    </div>
  );
}

export default function Tactics() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const { match: nextMatch, loading: nextMatchLoading } = useNextMatch(activeGroupId, matchId ?? null);
  const { isGroupAdmin } = useIsAdmin();
  const { busy, setTacticalPosition } = useLiveMatch(activeGroupId);
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();

  const courtType = nextMatch?.sportName?.toLowerCase().includes("society") ? "society" : "futsal";
  const activePositions = courtType === "futsal" ? POSITIONS_FUTSAL : POSITIONS_SOCIETY;
  const currentUserId = user?.id;

  const { loading, teamA, teamB, error, selectPosition } = useTacticsBoard(
    nextMatch,
    currentUserId,
    activePositions,
    isGroupAdmin,
    setTacticalPosition,
  );

  const isPreparing = nextMatch?.status === "preparing";
  const isOpen = nextMatch?.status === "open";
  const canAccess = !!nextMatch && (nextMatch.myStatus === "confirmed" || isGroupAdmin);

  if (nextMatchLoading || loading) return <TacticsLoading />;
  if (error) return <TacticsError message={error} />;
  if (!nextMatch || !canAccess) return <TacticsUnconfirmed courtType={courtType} hasMatch={!!nextMatch} />;

  if (!isOpen && !isPreparing) return <TacticsUnconfirmed courtType={courtType} hasMatch={!!nextMatch} />;

  const isFutsal = courtType === "futsal";
  const courtImage = isFutsal ? "/courts/futsal.jpg" : "/courts/society.jpg";
  const courtName = isFutsal ? "Quadra de Futsal" : "Quadra Society";
  const layoutPositions = (isDesktop ? activePositions.map((p) => ({ ...p, x: p.y, y: 100 - p.x })) : [...activePositions]) as LayoutPosition[];

  const matchInfo = {
    opponent: nextMatch.title,
    date: `${nextMatch.date} • ${nextMatch.time}`,
    court: courtName,
  };
  const teamAName = nextMatch.teamAName ?? "Time A";
  const teamBName = nextMatch.teamBName ?? "Time B";

  const handleStartGame = async () => {
    if (!nextMatch) return;
    navigate(`/matches/${nextMatch.id}/colors`);
  };

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 shrink-0 border-b border-outline-variant gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {matchId && (
              <button
                type="button"
                onClick={() => navigate(`/matches/${matchId}/prepare`)}
                className="p-2 hover:bg-surface-variant rounded-lg transition-colors shrink-0"
                aria-label="Voltar"
              >
                <MaterialIcon name="arrow_back" className="w-5 h-5 text-on-surface-variant" />
              </button>
            )}
            <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">{courtName}</h2>
          </div>
          {isPreparing && isGroupAdmin && (
            <button
              type="button"
              onClick={handleStartGame}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-mono text-label-bold border border-outline-variant active:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MaterialIcon name="play_arrow" className="w-4 h-4" />
              Iniciar Jogo
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8 px-4 md:px-margin-desktop py-6">
          <CourtArea
            teamA={teamA}
            teamB={teamB}
            layoutPositions={layoutPositions}
            courtImage={courtImage}
            isDesktop={isDesktop}
            currentUserId={currentUserId}
            isGroupAdmin={isGroupAdmin}
            onSelect={selectPosition}
            teamAName={teamAName}
            teamBName={teamBName}
          />

          <SidebarTeams
            teamA={teamA}
            teamB={teamB}
            matchInfo={matchInfo}
            courtName={courtName}
            currentUserId={currentUserId}
            teamAName={teamAName}
            teamBName={teamBName}
          />
        </div>
      </div>
    </AppShell>
  );
}
