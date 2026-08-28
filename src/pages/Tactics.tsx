import { useEffect, useState } from "react";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { Skeleton, SkeletonPlayerRow } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { useNextMatch } from "../hooks/useNextMatch";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { supabase } from "../lib/supabaseClient";

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
  "Ala Esq.": "ala_e",
  "Ala Direito": "ala_d",
  "Ala Dir.": "ala_d",
  Fixo: "fixo",
  Goleiro: "gol",
  "Meia Esquerdo": "meia_e",
  "Meia Esq.": "meia_e",
  "Meia Direito": "meia_d",
  "Meia Dir.": "meia_d",
};

interface Player {
  id: string;
  name: string;
  initials: string;
  position: PositionId | null;
  favoritePosition: PositionId | null;
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
  isMe,
  onSelect,
}: Readonly<{
  short: string;
  label: string;
  x: number;
  y: number;
  id: PositionId;
  occupant?: Player;
  isMe: boolean;
  onSelect: () => void;
}>) {
  const canSelect = !occupant || isMe;

  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
        <button
          type="button"
          onClick={onSelect}
          disabled={!canSelect}
          aria-label={occupant ? `${label}: ${occupant.name}` : `${label}: disponível`}
          className={`relative w-10 h-10 rounded-full flex items-center justify-center font-mono text-label-bold text-sm shadow-lg transition-transform active:scale-90 ${
            occupant
              ? `border-2 border-white/30 ${nodeClasses(id)}`
              : "border-2 border-dashed border-white/40 bg-surface-container-highest/50 text-on-surface-variant"
          } ${canSelect ? "cursor-pointer" : "cursor-not-allowed"} ${!occupant ? "hover:border-white/80 hover:text-on-surface" : ""}`}
        >
          {occupant ? occupant.initials : short}
        </button>
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
          <path d="M 7 3 A 4 4 0 0 0 3 7" />
          <path d="M 163 3 A 4 4 0 0 1 167 7" />
          <path d="M 7 97 A 4 4 0 0 1 3 93" />
          <path d="M 163 97 A 4 4 0 0 0 167 93" />
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
        <path d="M 7 3 A 4 4 0 0 0 3 7" />
        <path d="M 93 3 A 4 4 0 0 1 97 7" />
        <path d="M 3 163 A 4 4 0 0 0 7 167" />
        <path d="M 97 163 A 4 4 0 0 1 93 167" />
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
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono border border-white/20 shrink-0 ${
            player.position ? nodeClasses(player.position) : "bg-surface-variant text-on-surface-variant"
          }`}
        >
          {player.initials}
        </div>
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
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono border border-white/20 shrink-0 ${
            player.position ? nodeClasses(player.position) : "bg-surface-variant text-on-surface-variant"
          }`}
        >
          {player.initials}
        </div>
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
  match,
  courtLabel,
  currentUserId,
  unconfirmedMessage,
}: Readonly<{
  players: Player[];
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
        <p className="font-mono text-label-sm text-on-surface truncate">Escalação para {match.opponent}</p>
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
            starters.map((player) => <PlayerRow key={player.id} player={player} isMe={player.id === currentUserId} />)
          )}
        </div>
        <div className="border-t border-outline-variant/30">
          <div className="px-3 pt-2 pb-1">
            <h5 className="font-mono text-label-bold text-on-surface-variant uppercase text-[10px]">Reservas ({reserves.length})</h5>
          </div>
          <div className="p-2 pt-0 space-y-0.5">
            {reserves.map((player) => (
              <PlayerRow key={player.id} player={player} isMe={player.id === currentUserId} />
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
            <DesktopPlayerRow key={player.id} player={player} isMe={player.id === currentUserId} />
          ))}
        </div>
      </div>
    </div>
  );
}

// HELPERS DE BUSCA & ESTADO

async function fetchMatchData(matchId: string, userId?: string, activePositions: readonly { id: string }[] = []) {
  const [playersRes, favoriteRes] = await Promise.all([
    supabase.from("match_players").select("user_id, guest_name, team, users(name, avatar_url)").eq("match_id", matchId).eq("status", "confirmed"),

    userId
      ? supabase
          .from("user_favorite_positions")
          .select("position_id, is_primary, positions(name)")
          .eq("user_id", userId)
          .order("is_primary", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (playersRes.error) {
    throw new Error("Erro ao carregar jogadores");
  }

  let favoritePosId: PositionId | null = null;
  if (favoriteRes.data && favoriteRes.data.length > 0) {
    const primary = favoriteRes.data.find((row) => row.is_primary) ?? favoriteRes.data[0];
    const positionName = primary.positions?.name;

    if (positionName && DB_POSITION_TO_LOCAL[positionName]) {
      const localId = DB_POSITION_TO_LOCAL[positionName];
      if (activePositions.some((p) => p.id === localId)) {
        favoritePosId = localId;
      }
    }
  }

  return (playersRes.data ?? []).map((row) => {
    const fullName = row.users?.name ?? row.guest_name ?? "Convidado";
    const parts = fullName.trim().split(" ");
    const initials = parts
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const isCurrentUser = row.user_id === userId;

    return {
      id: row.user_id ?? row.guest_name ?? "unknown",
      name: fullName,
      initials,
      position: isCurrentUser ? favoritePosId : null,
      favoritePosition: isCurrentUser ? favoritePosId : null,
    };
  });
}

function useTacticsBoard(
  nextMatch: { id: string } | null | undefined,
  currentUserId: string | undefined,
  activePositions: readonly { id: string }[],
  isConfirmed: boolean,
) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!nextMatch || !isConfirmed) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const data = await fetchMatchData(nextMatch.id, currentUserId, activePositions);
        if (isMounted) {
          setPlayers(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido");
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [nextMatch, currentUserId, activePositions, isConfirmed]);

  const selectPosition = (posId: PositionId) => {
    if (!currentUserId) return;
    setPlayers((prev) => {
      const occupiedByOther = prev.some((p) => p.position === posId && p.id !== currentUserId);
      if (occupiedByOther) return prev;
      return prev.map((p) => (p.id === currentUserId ? { ...p, position: p.position === posId ? null : posId } : p));
    });
  };

  return { loading, players, error, selectPosition };
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

export default function Tactics() {
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const { match: nextMatch, loading: nextMatchLoading } = useNextMatch(activeGroupId);
  const isDesktop = useIsDesktop();

  const courtType = nextMatch?.sportName?.toLowerCase().includes("society") ? "society" : "futsal";
  const activePositions = courtType === "futsal" ? POSITIONS_FUTSAL : POSITIONS_SOCIETY;
  const currentUserId = user?.id;
  const isConfirmed = !!nextMatch && nextMatch.myStatus === "confirmed";

  const { loading, players, error, selectPosition } = useTacticsBoard(nextMatch, currentUserId, activePositions, isConfirmed);

  if (nextMatchLoading || loading) return <TacticsLoading />;
  if (error) return <TacticsError message={error} />;
  if (!nextMatch || !isConfirmed) return <TacticsUnconfirmed courtType={courtType} hasMatch={!!nextMatch} />;

  const courtImage = courtType === "futsal" ? "/courts/futsal.jpg" : "/courts/society.jpg";
  const layoutPositions = isDesktop ? activePositions.map((p) => ({ ...p, x: p.y, y: p.x })) : activePositions;

  const matchInfo = {
    opponent: nextMatch.title,
    date: `${nextMatch.date} • ${nextMatch.time}`,
    court: courtType === "futsal" ? "Quadra de Futsal" : "Quadra Society",
  };

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 shrink-0 border-b border-outline-variant gap-4">
          <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">
            {courtType === "futsal" ? "Quadra de Futsal" : "Quadra Society"}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8 px-4 md:px-margin-desktop py-6">
          <div
            className={`relative w-full max-w-85 md:max-w-3xl lg:max-w-none lg:flex-1 bg-linear-to-br from-slate-900 to-blue-900 rounded-2xl border-4 border-surface-container-highest overflow-hidden shadow-2xl ${
              isDesktop ? "aspect-[1.7/1]" : "aspect-[1/1.7]"
            }`}
          >
            <img src={courtImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            <CourtMarkings horizontal={isDesktop} />

            {layoutPositions.map((pos) => {
              const occupant = players.find((p) => p.position === pos.id);
              return (
                <TacticalNode
                  key={pos.id}
                  id={pos.id}
                  short={pos.short}
                  label={pos.label}
                  x={pos.x}
                  y={pos.y}
                  occupant={occupant}
                  isMe={!!occupant && occupant.id === currentUserId}
                  onSelect={() => selectPosition(pos.id)}
                />
              );
            })}
          </div>

          <TeamList
            players={players}
            match={matchInfo}
            courtLabel={courtType === "futsal" ? "Quadra de Futsal" : "Quadra Society"}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </AppShell>
  );
}
