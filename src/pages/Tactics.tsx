import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { animate, stagger } from "animejs";
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
  { id: "ala_e", label: "Ala Esquerdo", short: "AE", x: 20, y: 45 },
  { id: "ala_d", label: "Ala Direito", short: "AD", x: 80, y: 45 },
  { id: "fixo", label: "Fixo", short: "FIX", x: 50, y: 70 },
  { id: "gol", label: "Goleiro", short: "GO", x: 50, y: 90 },
] as const;

const POSITIONS_SOCIETY = [
  ...POSITIONS_FUTSAL,
  { id: "meia_e", label: "Meia Esquerdo", short: "MEI", x: 35, y: 38 },
  { id: "meia_d", label: "Meia Direito", short: "MEI", x: 65, y: 38 },
] as const;

type PositionId = (typeof POSITIONS_FUTSAL)[number]["id"] | (typeof POSITIONS_SOCIETY)[number]["id"];
type TeamKey = "A" | "B";

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

function getTacticalNodeAriaLabel(label: string, occupant?: Player, isOpponentView?: boolean): string {
  if (occupant) {
    const suffix = isOpponentView ? " (Adversário)" : "";
    return `${label}: ${occupant.name}${suffix}`;
  }
  const state = isOpponentView ? "Disponível (Adversário)" : "disponível";
  return `${label}: ${state}`;
}

function getTacticalNodeBorder(occupant?: Player, isOpponentView?: boolean, id?: PositionId): string {
  if (occupant) {
    const borderStyle = isOpponentView ? "border-outline-variant/60 opacity-90" : "border-white/30";
    return `border-2 ${borderStyle} ${id ? nodeClasses(id) : ""}`;
  }
  if (isOpponentView) {
    return "border-2 border-dashed border-outline-variant/40 bg-surface-container/30 text-on-surface-variant/40";
  }
  return "border-2 border-dashed border-white/40 bg-surface-container-highest/50 text-on-surface-variant";
}

function getTacticalNodeInitial(occupant?: Player, short?: string): string | null {
  if (occupant?.avatar) return null;
  if (occupant) return occupant.initials;
  return short ?? "";
}

function getTacticalNodeLabelClass(occupant?: Player): string {
  if (occupant) return "text-on-surface bg-surface-container/70";
  return "text-on-surface-variant/70 bg-surface-container/40";
}

const TacticalNode = memo(function TacticalNode({
  short,
  label,
  x,
  y,
  id,
  occupant,
  canSelect,
  isOpponentView,
  onSelect,
}: Readonly<{
  short: string;
  label: string;
  x: number;
  y: number;
  id: PositionId;
  occupant?: Player;
  canSelect: boolean;
  isOpponentView?: boolean;
  onSelect: (posId: PositionId | null) => void;
}>) {
  const isFavorite = Boolean(occupant?.favoritePosition && occupant.position === occupant.favoritePosition);
  const initial = getTacticalNodeInitial(occupant, short);
  const ariaLabel = getTacticalNodeAriaLabel(label, occupant, isOpponentView);
  const borderClasses = getTacticalNodeBorder(occupant, isOpponentView, id);
  const labelClass = getTacticalNodeLabelClass(occupant);

  return (
    <div className="tactical-node absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <button
            type="button"
            onClick={() => onSelect(id)}
            disabled={!canSelect}
            aria-label={ariaLabel}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center font-mono text-label-bold text-sm shadow-lg transition-transform ${
              canSelect ? "active:scale-90 cursor-pointer" : "cursor-default"
            } overflow-hidden ${borderClasses} ${canSelect && !occupant ? "hover:border-white/80 hover:text-on-surface" : ""}`}
          >
            {occupant?.avatar ? <img src={occupant.avatar} alt={occupant.name} className="w-full h-full object-cover" /> : initial}
          </button>

          {isFavorite && (
            <span className="absolute -top-1 -right-1 z-10 text-tertiary rounded-full p-0.5 shadow-md">
              <MaterialIcon name="star" className="w-3.5 h-3.5 fill-current" />
            </span>
          )}
        </div>

        <span className={`mt-1 font-mono text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${labelClass}`}>
          {occupant ? occupant.name : label}
        </span>
      </div>
    </div>
  );
});

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

const TeamList = memo(function TeamList({
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
});

// HELPERS DE BUSCA & ESTADO

interface FetchedTeams {
  teamA: Player[];
  teamB: Player[];
  all: Player[];
}

async function fetchFavoritePositionsMap(
  playerUserIds: string[],
): Promise<Map<string, { name: string | null; code: string | null }>> {
  const favByPlayer = new Map<string, { name: string | null; code: string | null }>();
  if (playerUserIds.length === 0) return favByPlayer;

  const favRes = await supabase
    .from("user_favorite_positions")
    .select("user_id, position_id, is_primary, positions(name, code)")
    .in("user_id", playerUserIds)
    .order("is_primary", { ascending: false });

  const favRows = (favRes.data ?? []) as {
    user_id: string;
    positions: { name: string | null; code: string | null } | null;
  }[];

  for (const row of favRows) {
    if (!favByPlayer.has(row.user_id)) {
      favByPlayer.set(row.user_id, {
        name: row.positions?.name ?? null,
        code: row.positions?.code ?? null,
      });
    }
  }

  return favByPlayer;
}

function resolveLocalPosition(
  dbPosition: string | null,
  activePositions: readonly { id: string }[],
): PositionId | null {
  if (!dbPosition || !DB_POSITION_TO_LOCAL[dbPosition]) return null;
  const localId = DB_POSITION_TO_LOCAL[dbPosition];
  return activePositions.some((p) => p.id === localId) ? localId : null;
}

function resolveFavoritePosition(
  fav: { name: string | null; code: string | null } | undefined,
  activePositions: readonly { id: string }[],
): PositionId | null {
  if (!fav) return null;
  const localByName = fav.name ? DB_POSITION_TO_LOCAL[fav.name] : undefined;
  const localByCode = fav.code ? DB_POSITION_CODE_TO_LOCAL[fav.code.toUpperCase()] : undefined;
  const localId = localByName ?? localByCode ?? null;
  if (localId && activePositions.some((p) => p.id === localId)) {
    return localId;
  }
  return null;
}

function getPlayerInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  return parts
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const playerUserIds = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id))));
  const favByPlayer = await fetchFavoritePositionsMap(playerUserIds);

  const players: Player[] = rows.map((row) => {
    const fullName = row.users?.name ?? row.guest_name ?? "Convidado";
    const fav = row.user_id ? favByPlayer.get(row.user_id) : undefined;

    return {
      id: row.user_id ?? row.guest_name ?? "unknown",
      name: fullName,
      initials: getPlayerInitials(fullName),
      avatar: row.users?.avatar_url ?? null,
      position: resolveLocalPosition(row.tactical_position, activePositions),
      favoritePosition: resolveFavoritePosition(fav, activePositions),
      matchPlayerId: row.id,
      userId: row.user_id ?? null,
      team: row.team ?? null,
    };
  });

  return {
    teamA: players.filter((p) => p.team === "A"),
    teamB: players.filter((p) => p.team === "B"),
    all: players,
  };
}

function canUserSelectPosition(
  target: Player,
  posId: PositionId | null,
  currentUserId: string | undefined,
  isGroupAdmin: boolean,
  players: Player[],
): boolean {
  const isOwn = target.userId === currentUserId;
  if (!isGroupAdmin && !isOwn) return false;
  if (posId !== null) {
    const occupiedByOther = players.some((p) => p.position === posId && p.id !== target.id && p.team === target.team);
    if (occupiedByOther) return false;
  }
  return true;
}

function updatePositionsOnToggle(
  prevList: Player[],
  playerId: string,
  posId: PositionId | null,
): Player[] {
  return prevList.map((p) => {
    if (p.id !== playerId) return p;
    const nextPosition = p.position === posId ? null : posId;
    return { ...p, position: nextPosition };
  });
}

function updatePositionsOnRealtime(
  prevList: Player[],
  matchPlayerId: string,
  localPos: PositionId | null,
): Player[] {
  return prevList.map((p) => (p.matchPlayerId === matchPlayerId ? { ...p, position: localPos } : p));
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
  const isFirstLoad = useRef(true);

  const matchId = nextMatch?.id;
  const canAccess = Boolean(nextMatch && (nextMatch.myStatus === "confirmed" || isGroupAdmin));

  const applyFetchedData = useCallback((data: FetchedTeams) => {
    setPlayers(data.all);
    setTeamA(data.teamA);
    setTeamB(data.teamB);
    setError(null);
  }, []);

  const refetch = useCallback(async () => {
    if (!matchId || !canAccess) {
      applyFetchedData({ teamA: [], teamB: [], all: [] });
      setLoading(false);
      return;
    }
    try {
      const data = await fetchMatchData(matchId, activePositions);
      applyFetchedData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [matchId, activePositions, canAccess, applyFetchedData]);

  const refetchSilent = useCallback(async () => {
    if (!matchId || !canAccess) return;
    try {
      const data = await fetchMatchData(matchId, activePositions);
      applyFetchedData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido");
    }
  }, [matchId, activePositions, canAccess, applyFetchedData]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!isMounted) return;
      if (isFirstLoad.current) {
        setLoading(true);
        isFirstLoad.current = false;
      }
      await refetch();
    })();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, activePositions]);

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(uniqueChannelTopic(`tactics-${matchId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_players",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
            refetchSilent();
            return;
          }
          if (payload.eventType === "UPDATE") {
            const newRow = (payload as { new?: unknown }).new as { id: string; tactical_position: string | null } | undefined;
            if (!newRow) return;
            const localPos = newRow.tactical_position ? DB_POSITION_TO_LOCAL[newRow.tactical_position] : null;
            setPlayers((prev) => updatePositionsOnRealtime(prev, newRow.id, localPos));
            setTeamA((prev) => updatePositionsOnRealtime(prev, newRow.id, localPos));
            setTeamB((prev) => updatePositionsOnRealtime(prev, newRow.id, localPos));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, refetchSilent]);

  const selectPosition = useCallback(
    async (playerId: string, posId: PositionId | null) => {
      if (!matchId) return;
      const target = players.find((p) => p.id === playerId);
      if (!target) return;

      if (!canUserSelectPosition(target, posId, currentUserId, isGroupAdmin, players)) {
        return;
      }

      const dbName = posId ? LOCAL_TO_DB_POSITION[posId] : null;
      const result = await setTacticalPositionFn(target.matchPlayerId, dbName);
      if (result.error) return;

      setPlayers((prev) => updatePositionsOnToggle(prev, playerId, posId));
      setTeamA((prev) => updatePositionsOnToggle(prev, playerId, posId));
      setTeamB((prev) => updatePositionsOnToggle(prev, playerId, posId));
    },
    [matchId, players, currentUserId, isGroupAdmin, setTacticalPositionFn],
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

type LayoutMode = "desktop" | "mobile";
type TeamRelationship = "mine" | "opponent" | "neutral";
type UserRole = "admin" | "member";

interface LayoutPosition {
  id: PositionId;
  short: string;
  label: string;
  x: number;
  y: number;
}

function QuickTeamSwitchButton({
  relationship,
  role,
  otherTeamKey,
  onSwitchTeam,
}: Readonly<{
  relationship: TeamRelationship;
  role: UserRole;
  otherTeamKey: TeamKey;
  onSwitchTeam: (team: TeamKey) => void;
}>) {
  if (role === "admin") return null;

  if (relationship === "opponent") {
    return (
      <button
        type="button"
        onClick={() => onSwitchTeam(otherTeamKey)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-primary bg-primary/10 border border-primary/40 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
      >
        <MaterialIcon name="arrow_back" className="w-3.5 h-3.5" />
        Voltar ao Meu Time
      </button>
    );
  }

  if (relationship === "mine") {
    return (
      <button
        type="button"
        onClick={() => onSwitchTeam(otherTeamKey)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-on-surface-variant bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest hover:text-on-surface rounded-lg transition-colors cursor-pointer"
      >
        <MaterialIcon name="visibility" className="w-3.5 h-3.5 text-tertiary" />
        Ver Adversário
      </button>
    );
  }

  return null;
}

function CourtStatusBanner({
  teamName,
  relationship,
  role,
}: Readonly<{
  teamName: string;
  relationship: TeamRelationship;
  role: UserRole;
}>) {
  if (relationship === "opponent" && role !== "admin") {
    return (
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-tertiary-container/20 border border-tertiary/40 rounded-xl mb-3">
        <div className="flex items-center gap-2 font-mono text-xs text-tertiary font-bold">
          <MaterialIcon name="visibility" className="w-4 h-4 shrink-0" />
          <span>{teamName} — ESCALAÇÃO DO ADVERSÁRIO</span>
        </div>
        <span className="text-[10px] bg-tertiary/15 text-tertiary border border-tertiary/40 px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold">
          Somente Leitura
        </span>
      </div>
    );
  }

  if (relationship === "mine") {
    return (
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-primary/10 border border-primary/30 rounded-xl mb-3">
        <div className="flex items-center gap-2 font-mono text-xs text-primary font-bold">
          <MaterialIcon name="shield" className="w-4 h-4 shrink-0" />
          <span>{teamName} — SEU TIME</span>
        </div>
        <span className="font-mono text-[11px] text-on-surface-variant hidden sm:inline">Clique na posição para se escalar</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-surface-container-high border border-outline-variant/40 rounded-xl mb-3">
      <div className="flex items-center gap-2 font-mono text-xs text-on-surface font-bold">
        <MaterialIcon name="sports_soccer" className="w-4 h-4 text-primary shrink-0" />
        <span>{teamName}</span>
      </div>
      <span className="font-mono text-[11px] text-on-surface-variant hidden sm:inline">Escalação tática</span>
    </div>
  );
}

function CourtHeaderTabs({
  teamKey,
  teamName,
  otherTeamName,
  myTeam,
  otherTeamKey,
  relationship,
  role,
  onSwitchTeam,
}: Readonly<{
  teamKey: TeamKey;
  teamName: string;
  otherTeamName: string;
  myTeam: TeamKey | null;
  otherTeamKey: TeamKey;
  relationship: TeamRelationship;
  role: UserRole;
  onSwitchTeam: (team: TeamKey) => void;
}>) {
  const teamANameDisplay = teamKey === "A" ? teamName : otherTeamName;
  const teamBNameDisplay = teamKey === "B" ? teamName : otherTeamName;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl border border-outline-variant/30">
        <button
          type="button"
          onClick={() => onSwitchTeam("A")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
            teamKey === "A"
              ? "bg-primary text-on-primary font-bold shadow-md"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
        >
          <MaterialIcon name={myTeam === "A" ? "shield" : "sports_soccer"} className="w-3.5 h-3.5" />
          <span>{teamANameDisplay}</span>
          {myTeam === "A" && <span className="text-[10px] opacity-80">(Meu Time)</span>}
          {myTeam === "B" && <span className="text-[10px] opacity-80">(Adversário)</span>}
        </button>

        <button
          type="button"
          onClick={() => onSwitchTeam("B")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
            teamKey === "B"
              ? "bg-primary text-on-primary font-bold shadow-md"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
        >
          <MaterialIcon name={myTeam === "B" ? "shield" : "sports_soccer"} className="w-3.5 h-3.5" />
          <span>{teamBNameDisplay}</span>
          {myTeam === "B" && <span className="text-[10px] opacity-80">(Meu Time)</span>}
          {myTeam === "A" && <span className="text-[10px] opacity-80">(Adversário)</span>}
        </button>
      </div>

      <QuickTeamSwitchButton
        relationship={relationship}
        role={role}
        otherTeamKey={otherTeamKey}
        onSwitchTeam={onSwitchTeam}
      />
    </div>
  );
}

function CourtPitchCanvas({
  layoutPositions,
  courtImage,
  layoutMode,
  relationship,
  role,
  teamPlayers,
  currentUserId,
  courtRef,
  onSelect,
}: Readonly<{
  layoutPositions: LayoutPosition[];
  courtImage: string;
  layoutMode: LayoutMode;
  relationship: TeamRelationship;
  role: UserRole;
  teamPlayers: Player[];
  currentUserId: string | undefined;
  courtRef?: React.RefObject<HTMLDivElement | null>;
  onSelect: (playerId: string, posId: PositionId | null) => void;
}>) {
  const isDesktop = layoutMode === "desktop";
  const isOpponentView = relationship === "opponent" && role !== "admin";
  const hasPlayers = teamPlayers.length > 0;

  const nodeOnSelect = useCallback(
    (posId: PositionId | null) => {
      if (isOpponentView) return;
      const occupant = hasPlayers ? teamPlayers.find((p) => p.position === posId) : undefined;
      if (occupant) {
        onSelect(occupant.id, occupant.position === posId ? null : posId);
        return;
      }
      if (hasPlayers) {
        const meOnTeam = teamPlayers.find((p) => p.userId === currentUserId);
        if (meOnTeam) {
          onSelect(meOnTeam.id, posId);
        }
      }
    },
    [isOpponentView, hasPlayers, teamPlayers, currentUserId, onSelect],
  );

  return (
    <div
      ref={courtRef}
      className={`relative w-full max-w-85 md:max-w-3xl lg:max-w-none mx-auto lg:mx-0 bg-linear-to-br from-slate-900 to-blue-900 rounded-2xl border-4 ${
        isOpponentView ? "border-tertiary/50 ring-2 ring-tertiary/20" : "border-surface-container-highest"
      } overflow-hidden shadow-2xl transition-colors duration-300 ${isDesktop ? "aspect-[1.7/1]" : "aspect-[1/1.7]"}`}
    >
      <img src={courtImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      <CourtMarkings horizontal={isDesktop} />

      {isOpponentView && (
        <div className="absolute top-2.5 right-2.5 z-20 px-2 py-1 bg-surface-container-lowest/85 backdrop-blur-xs border border-tertiary/40 rounded-lg flex items-center gap-1.5 pointer-events-none shadow-md">
          <MaterialIcon name="lock" className="w-3.5 h-3.5 text-tertiary" />
          <span className="font-mono text-[10px] uppercase text-tertiary tracking-wider font-bold">Adversário (Leitura)</span>
        </div>
      )}

      {layoutPositions.map((pos) => {
        const occupant = hasPlayers ? teamPlayers.find((p) => p.position === pos.id) : undefined;
        const occupantIsMe = hasPlayers && occupant !== undefined && occupant.userId === currentUserId;
        const canEdit = role === "admin" || (relationship === "mine" && occupantIsMe);
        const canSelect = !isOpponentView && hasPlayers && (!occupant || canEdit);
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
            isOpponentView={isOpponentView}
            onSelect={nodeOnSelect}
          />
        );
      })}
    </div>
  );
}

const CourtCard = memo(function CourtCard({
  teamKey,
  teamName,
  teamPlayers,
  layoutPositions,
  courtImage,
  layoutMode,
  currentUserId,
  role,
  relationship,
  myTeam,
  otherTeamKey,
  otherTeamName,
  onSelect,
  onSwitchTeam,
  courtRef,
}: Readonly<{
  teamKey: TeamKey;
  teamName: string;
  teamPlayers: Player[];
  layoutPositions: LayoutPosition[];
  courtImage: string;
  layoutMode: LayoutMode;
  currentUserId: string | undefined;
  role: UserRole;
  relationship: TeamRelationship;
  myTeam: TeamKey | null;
  otherTeamKey: TeamKey;
  otherTeamName: string;
  onSelect: (playerId: string, posId: PositionId | null) => void;
  onSwitchTeam: (team: TeamKey) => void;
  courtRef?: React.RefObject<HTMLDivElement | null>;
}>) {
  return (
    <div className="w-full flex flex-col">
      <CourtHeaderTabs
        teamKey={teamKey}
        teamName={teamName}
        otherTeamName={otherTeamName}
        myTeam={myTeam}
        otherTeamKey={otherTeamKey}
        relationship={relationship}
        role={role}
        onSwitchTeam={onSwitchTeam}
      />

      <CourtStatusBanner
        teamName={teamName}
        relationship={relationship}
        role={role}
      />

      <CourtPitchCanvas
        layoutPositions={layoutPositions}
        courtImage={courtImage}
        layoutMode={layoutMode}
        relationship={relationship}
        role={role}
        teamPlayers={teamPlayers}
        currentUserId={currentUserId}
        courtRef={courtRef}
        onSelect={onSelect}
      />
    </div>
  );
});

const SidebarTeams = memo(function SidebarTeams({
  teamA,
  teamB,
  activeTeamKey,
  matchInfo,
  courtName,
  currentUserId,
  teamAName,
  teamBName,
  relationship,
}: Readonly<{
  teamA: Player[];
  teamB: Player[];
  activeTeamKey: TeamKey;
  matchInfo: { opponent: string; date: string; court: string };
  courtName: string;
  currentUserId: string | undefined;
  teamAName: string;
  teamBName: string;
  relationship: TeamRelationship;
}>) {
  const activePlayers = activeTeamKey === "A" ? teamA : teamB;
  const activeTeamLabel = activeTeamKey === "A" ? teamAName : teamBName;

  let teamBadge = "";
  if (relationship === "mine") {
    teamBadge = " • Seu Time";
  } else if (relationship === "opponent") {
    teamBadge = " • Adversário (Leitura)";
  }

  return (
    <div className="flex flex-col gap-4 w-full lg:w-105 lg:shrink-0">
      <TeamList
        players={activePlayers}
        teamLabel={`${activeTeamLabel}${teamBadge}`}
        match={matchInfo}
        courtLabel={courtName}
        currentUserId={currentUserId}
        unconfirmedMessage={relationship === "opponent" ? "Visualizando lista do time adversário" : undefined}
      />
    </div>
  );
});

function useTacticsConfig(nextMatch: NextMatchData | null, isDesktop: boolean, isGroupAdmin: boolean) {
  const courtType = nextMatch?.sportName?.toLowerCase().includes("society") ? "society" : "futsal";
  const activePositions = courtType === "futsal" ? POSITIONS_FUTSAL : POSITIONS_SOCIETY;
  const isFutsal = courtType === "futsal";
  const courtImage = isFutsal ? "/courts/futsal.jpg" : "/courts/society.jpg";
  const courtName = isFutsal ? "Quadra de Futsal" : "Quadra Society";
  const isPreparing = nextMatch?.status === "preparing";
  const canAccess = !!nextMatch && (nextMatch.myStatus === "confirmed" || isGroupAdmin);
  const canShowBoard = !!nextMatch && isPreparing;

  const layoutPositions = useMemo(
    () => (isDesktop ? activePositions.map((p) => ({ ...p, x: p.y, y: 100 - p.x })) : [...activePositions]) as LayoutPosition[],
    [isDesktop, activePositions],
  );

  const matchInfo = useMemo(
    () => ({
      opponent: nextMatch?.title ?? "",
      date: nextMatch ? `${nextMatch.date} • ${nextMatch.time}` : "",
      court: courtName,
    }),
    [nextMatch, courtName],
  );

  const teamAName = nextMatch?.teamAName ?? "Time A";
  const teamBName = nextMatch?.teamBName ?? "Time B";

  return {
    courtType,
    activePositions,
    courtImage,
    courtName,
    isPreparing,
    canAccess,
    canShowBoard,
    layoutPositions,
    matchInfo,
    teamAName,
    teamBName,
  };
}

function TacticsHeader({
  courtName,
  matchId,
  isPreparing,
  isGroupAdmin,
  busy,
  onBack,
  onStartGame,
}: Readonly<{
  courtName: string;
  matchId?: string;
  isPreparing: boolean;
  isGroupAdmin: boolean;
  busy: boolean;
  onBack: () => void;
  onStartGame: () => void;
}>) {
  return (
    <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 shrink-0 border-b border-outline-variant gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {matchId && (
          <button type="button" onClick={onBack} className="p-2 hover:bg-surface-variant rounded-lg transition-colors shrink-0" aria-label="Voltar">
            <MaterialIcon name="arrow_back" className="w-5 h-5 text-on-surface-variant" />
          </button>
        )}
        <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">{courtName}</h2>
      </div>
      {isPreparing && isGroupAdmin && (
        <button
          type="button"
          onClick={onStartGame}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-mono text-label-bold border border-outline-variant active:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MaterialIcon name="play_arrow" className="w-4 h-4" />
          Iniciar
        </button>
      )}
    </header>
  );
}

function useTacticsMatchData(matchId?: string) {
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const { match: nextMatch, loading: nextMatchLoading } = useNextMatch(activeGroupId, matchId ?? null);
  const { isGroupAdmin } = useIsAdmin();
  const { busy, setTacticalPosition } = useLiveMatch(activeGroupId);
  const isDesktop = useIsDesktop();
  const config = useTacticsConfig(nextMatch, isDesktop, isGroupAdmin);
  const currentUserId = user?.id;

  const board = useTacticsBoard(
    nextMatch,
    currentUserId,
    config.activePositions,
    isGroupAdmin,
    setTacticalPosition,
  );

  return {
    nextMatch,
    nextMatchLoading,
    isGroupAdmin,
    busy,
    isDesktop,
    config,
    currentUserId,
    board,
  };
}

function getTacticsEarlyState(
  loading: boolean,
  error: string | null,
  canAccess: boolean,
  canShowBoard: boolean,
  courtType: string,
  hasNextMatch: boolean,
): React.ReactNode | null {
  if (loading) return <TacticsLoading />;
  if (error) return <TacticsError message={error} />;
  if (!canAccess || !canShowBoard) {
    return <TacticsUnconfirmed courtType={courtType} hasMatch={hasNextMatch} />;
  }
  return null;
}

function getTeamRelationship(activeTeamKey: TeamKey, myTeam: TeamKey | null): TeamRelationship {
  if (!myTeam) return "neutral";
  return activeTeamKey === myTeam ? "mine" : "opponent";
}

export default function Tactics() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const {
    nextMatch,
    nextMatchLoading,
    isGroupAdmin,
    busy,
    isDesktop,
    config,
    currentUserId,
    board,
  } = useTacticsMatchData(matchId);

  const myTeam = useMemo((): TeamKey | null => {
    if (board.teamA.some((p) => p.userId === currentUserId)) return "A";
    if (board.teamB.some((p) => p.userId === currentUserId)) return "B";
    return null;
  }, [board.teamA, board.teamB, currentUserId]);

  const [userSelectedTeam, setUserSelectedTeam] = useState<TeamKey | null>(null);
  const activeTeamKey: TeamKey = userSelectedTeam ?? myTeam ?? "A";

  const courtContainerRef = useRef<HTMLDivElement>(null);

  const handleSwitchTeam = useCallback(
    (newTeam: TeamKey) => {
      if (newTeam === activeTeamKey) return;
      const direction = newTeam === "B" ? 1 : -1;

      if (courtContainerRef.current) {
        animate(courtContainerRef.current, {
          translateX: [direction * 50, 0],
          opacity: [0.2, 1],
          scale: [0.96, 1],
          duration: 340,
          ease: "outCubic",
        });

        const nodes = courtContainerRef.current.querySelectorAll(".tactical-node");
        if (nodes.length > 0) {
          animate(nodes, {
            scale: [0.6, 1],
            opacity: [0, 1],
            translateY: [8, 0],
            delay: stagger(30),
            duration: 260,
            ease: "outBack",
          });
        }
      }

      setUserSelectedTeam(newTeam);
    },
    [activeTeamKey],
  );

  useEffect(() => {
    if (courtContainerRef.current && !board.loading && !nextMatchLoading) {
      const nodes = courtContainerRef.current.querySelectorAll(".tactical-node");
      if (nodes.length > 0) {
        animate(nodes, {
          scale: [0.6, 1],
          opacity: [0, 1],
          translateY: [8, 0],
          delay: stagger(30),
          duration: 260,
          ease: "outBack",
        });
      }
    }
  }, [board.loading, nextMatchLoading]);

  const earlyState = getTacticsEarlyState(
    nextMatchLoading || board.loading,
    board.error,
    config.canAccess,
    config.canShowBoard,
    config.courtType,
    Boolean(nextMatch),
  );
  if (earlyState) return earlyState;

  const activePlayers = activeTeamKey === "A" ? board.teamA : board.teamB;
  const activeTeamName = activeTeamKey === "A" ? config.teamAName : config.teamBName;
  const otherTeamKey: TeamKey = activeTeamKey === "A" ? "B" : "A";
  const otherTeamName = activeTeamKey === "A" ? config.teamBName : config.teamAName;

  const relationship = getTeamRelationship(activeTeamKey, myTeam);
  const role: UserRole = isGroupAdmin ? "admin" : "member";
  const layoutMode: LayoutMode = isDesktop ? "desktop" : "mobile";

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        <TacticsHeader
          courtName={config.courtName}
          matchId={matchId}
          isPreparing={config.isPreparing}
          isGroupAdmin={isGroupAdmin}
          busy={busy}
          onBack={() => navigate(`/matches/${matchId}/prepare`)}
          onStartGame={() => navigate(`/matches/${nextMatch?.id}/colors`)}
        />

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8 px-4 md:px-margin-desktop py-6">
          <div className="w-full lg:flex-1 flex flex-col">
            <CourtCard
              teamKey={activeTeamKey}
              teamName={activeTeamName}
              teamPlayers={activePlayers}
              layoutPositions={config.layoutPositions}
              courtImage={config.courtImage}
              layoutMode={layoutMode}
              currentUserId={currentUserId}
              role={role}
              relationship={relationship}
              myTeam={myTeam}
              otherTeamKey={otherTeamKey}
              otherTeamName={otherTeamName}
              onSelect={board.selectPosition}
              onSwitchTeam={handleSwitchTeam}
              courtRef={courtContainerRef}
            />
          </div>

          <SidebarTeams
            teamA={board.teamA}
            teamB={board.teamB}
            activeTeamKey={activeTeamKey}
            matchInfo={config.matchInfo}
            courtName={config.courtName}
            currentUserId={currentUserId}
            teamAName={config.teamAName}
            teamBName={config.teamBName}
            relationship={relationship}
          />
        </div>
      </div>
    </AppShell>
  );
}
