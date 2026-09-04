import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { Avatar } from "../components/ui/Avatar";
import { MatchErrorState } from "../components/match/MatchErrorState";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useAuth } from "../hooks/useAuth";
import { validateMatchGroup } from "../lib/groupGuard";
import { supabase } from "../lib/supabaseClient";
import { performClientSideDraw } from "../lib/teamDrawer";

interface MatchPlayerRow {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  team: string;
  is_sub: boolean;
  status: string;
  users: { name: string | null; avatar_url: string | null } | null;
}

interface MatchRow {
  organizer_id: string | null;
  team_a_name: string | null;
  team_b_name: string | null;
  max_players: number;
  status: string;
}

function teamButtonClass(selected: string, team: string): string {
  if (selected !== team) {
    return "bg-surface-container text-on-surface-variant border-outline-variant";
  }
  if (team === "A") {
    return "bg-error-container text-on-error-container border-error";
  }
  return "bg-primary-container text-on-primary-container border-primary";
}

function ActionsBar({
  redrawing,
  swapCount,
  onRedraw,
  onSwap,
}: Readonly<{
  redrawing: boolean;
  swapCount: number;
  onRedraw: () => void;
  onSwap: () => void;
}>) {
  return (
    <section className="mb-6 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        disabled={redrawing}
        onClick={onRedraw}
        className="flex-1 py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {redrawing ? <MaterialIcon name="pending" className="w-5 h-5 animate-spin" /> : <MaterialIcon name="casino" className="w-5 h-5" />}
        {redrawing ? "SORTEANDO..." : "SORTEAR TIMES"}
      </button>
      {swapCount > 0 && (
        <button
          type="button"
          disabled={swapCount !== 2}
          onClick={onSwap}
          className="flex-1 py-3 bg-secondary-container text-on-secondary-container font-mono text-label-bold border border-outline-variant active:bg-surface-variant transition-transform disabled:opacity-50"
        >
          <MaterialIcon name="swap_horiz" className="w-4 h-4 inline mr-1" />
          TROCAR SELECIONADOS ({swapCount}/2)
        </button>
      )}
    </section>
  );
}

function PlayerItem({
  player,
  teamName,
  isSelected,
  canManage,
  isPreparing,
  onSwapSelect,
  onAssignTeam,
  onRemove,
}: Readonly<{
  player: MatchPlayerRow;
  teamName: string;
  isSelected: boolean;
  canManage: boolean;
  isPreparing: boolean;
  onSwapSelect: (id: string) => void;
  onAssignTeam: (id: string, team: string) => void;
  onRemove: (id: string) => void;
}>) {
  const isA = player.team === "A";
  const isSwapTarget = canManage && isPreparing;
  const borderClass = isSelected ? "border-primary ring-1 ring-primary" : "border-outline-variant";
  const badgeClass = isA ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container";

  return (
    <div className={`flex items-center justify-between p-3 bg-surface-container-high border rounded-lg transition-colors ${borderClass}`}>
      <button
        type="button"
        disabled={!isSwapTarget}
        onClick={() => onSwapSelect(player.id)}
        className="flex items-center gap-3 min-w-0 text-left flex-1"
      >
        <Avatar
          src={player.users?.avatar_url ?? null}
          alt={player.users?.name ?? player.guest_name ?? "Jogador"}
          className="w-8 h-8 rounded-full shrink-0"
        />
        <div className="min-w-0">
          <span className="font-mono text-label-sm text-on-surface">
            {player.users?.name ?? player.guest_name ?? "Convidado"}
            {player.is_sub && <span className="ml-1 text-on-surface-variant">(reserva)</span>}
          </span>
          <span className={`ml-2 font-mono text-label-sm px-2 py-0.5 rounded ${badgeClass}`}>{teamName}</span>
        </div>
      </button>

      {canManage && (
        <div className="flex items-center gap-1 shrink-0">
          {isPreparing && (
            <button
              type="button"
              onClick={() => onAssignTeam(player.id, isA ? "B" : "A")}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              aria-label="Mover para o outro time"
            >
              <MaterialIcon name="swap_horiz" className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(player.id)}
            className="p-2 text-on-surface-variant hover:text-error transition-colors"
            aria-label="Remover jogador"
          >
            <MaterialIcon name="remove_circle_outline" className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmedPlayersList({
  players,
  maxPlayers,
  canManage,
  isPreparing,
  swapSelectedSet,
  teamAName,
  teamBName,
  onSwapSelect,
  onAssignTeam,
  onRemove,
}: Readonly<{
  players: MatchPlayerRow[];
  maxPlayers: number | string;
  canManage: boolean;
  isPreparing: boolean;
  swapSelectedSet: Set<string>;
  teamAName: string;
  teamBName: string;
  onSwapSelect: (id: string) => void;
  onAssignTeam: (id: string, team: string) => void;
  onRemove: (id: string) => void;
}>) {
  return (
    <section className="mb-8">
      <h2 className="text-title-md font-mono text-on-surface mb-3">
        Confirmados ({players.length}/{maxPlayers})
      </h2>
      {players.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Nenhum jogador confirmado.</p>
      ) : (
        <div className="space-y-2">
          {players.map((player) => {
            const isA = player.team === "A";
            const isSwapTarget = canManage && isPreparing;
            const isSelected = isSwapTarget && swapSelectedSet.has(player.id);
            return (
              <PlayerItem
                key={player.id}
                player={player}
                teamName={isA ? teamAName : teamBName}
                isSelected={isSelected}
                canManage={canManage}
                isPreparing={isPreparing}
                onSwapSelect={onSwapSelect}
                onAssignTeam={onAssignTeam}
                onRemove={onRemove}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function AddGuestSection({
  isFull,
  playerCount,
  maxPlayers,
  guestName,
  guestTeam,
  teamAName,
  teamBName,
  submitting,
  onGuestNameChange,
  onGuestTeamChange,
  onAddGuest,
}: Readonly<{
  isFull: boolean;
  playerCount: number;
  maxPlayers: number | string;
  guestName: string;
  guestTeam: string;
  teamAName: string;
  teamBName: string;
  submitting: boolean;
  onGuestNameChange: (val: string) => void;
  onGuestTeamChange: (val: string) => void;
  onAddGuest: (e: React.SyntheticEvent) => void;
}>) {
  return (
    <section className="p-4 bg-surface-container-high border border-outline-variant rounded-xl">
      <h2 className="text-title-md font-mono text-on-surface mb-3">Adicionar Convidado</h2>
      {isFull ? (
        <p className="font-mono text-label-sm text-warning">
          Partida cheia ({playerCount}/{maxPlayers}). Remova um jogador para adicionar outro.
        </p>
      ) : (
        <form onSubmit={onAddGuest} className="space-y-3">
          <div>
            <label htmlFor="guest-name" className="block text-label-sm font-mono text-on-surface-variant mb-1">
              Nome do convidado
            </label>
            <input
              id="guest-name"
              type="text"
              value={guestName}
              onChange={(e) => onGuestNameChange(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full px-4 py-3 bg-surface-container border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
              required
            />
          </div>
          <fieldset>
            <legend className="block text-label-sm font-mono text-on-surface-variant mb-1">Time</legend>
            <div className="flex gap-2">
              {[
                { value: "A", label: teamAName },
                { value: "B", label: teamBName },
              ].map((team) => (
                <button
                  key={team.value}
                  type="button"
                  onClick={() => onGuestTeamChange(team.value)}
                  className={`flex-1 py-3 font-mono text-label-bold border transition-colors ${teamButtonClass(guestTeam, team.value)}`}
                >
                  {team.label}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={submitting || !guestName.trim()}
            className="w-full py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <MaterialIcon name="pending" className="w-5 h-5 animate-spin" /> : <MaterialIcon name="person_add" className="w-5 h-5" />}
            {submitting ? "ADICIONANDO..." : "ADICIONAR CONVIDADO"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function MatchPlayersManagement() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { activeGroupId } = useActiveGroup();
  const { user } = useAuth();
  const [players, setPlayers] = useState<MatchPlayerRow[]>([]);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [guestTeam, setGuestTeam] = useState("A");
  const [submitting, setSubmitting] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const [swapSelected, setSwapSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId || !activeGroupId) return;

    validateMatchGroup(matchId, activeGroupId).then(({ valid, error: guardError }) => {
      if (!valid) {
        setError(guardError ?? "Acesso negado");
        setLoading(false);
      }
    });
  }, [matchId, activeGroupId]);

  const fetchAll = useCallback(async () => {
    if (!matchId) return;

    const [matchRes, playersRes] = await Promise.all([
      supabase.from("matches").select("organizer_id, team_a_name, team_b_name, max_players, status").eq("id", matchId).maybeSingle(),
      supabase
        .from("match_players")
        .select("id, user_id, guest_name, team, is_sub, status, users(name, avatar_url)")
        .eq("match_id", matchId)
        .eq("status", "confirmed")
        .order("team", { ascending: true }),
    ]);

    if (matchRes.data) setMatch(matchRes.data as MatchRow);
    setPlayers((playersRes.data ?? []) as MatchPlayerRow[]);
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const isCreator = user?.id != null && user.id === match?.organizer_id;
  const isPreparing = match?.status === "preparing";
  const canManage = isCreator;

  async function handleRemove(playerId: string) {
    if (!matchId || !activeGroupId) return;
    const { valid, error: guardError } = await validateMatchGroup(matchId, activeGroupId);
    if (!valid) {
      setError(guardError ?? "Acesso negado");
      return;
    }
    await supabase.from("match_players").delete().eq("id", playerId);
    fetchAll();
  }

  async function handleAddGuest(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!matchId || !guestName.trim() || !activeGroupId) return;

    if (match && players.length >= match.max_players) {
      setFeedback(`Partida cheia (${players.length}/${match.max_players}). Não é possível adicionar mais convidados.`);
      return;
    }

    const { valid, error: guardError } = await validateMatchGroup(matchId, activeGroupId);
    if (!valid) {
      setError(guardError ?? "Acesso negado");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const guestPayload = {
        match_id: matchId,
        guest_name: guestName.trim(),
        team: guestTeam,
        is_sub: false,
        status: "confirmed" as const,
      };
      const { error: insertError } = await supabase.from("match_players").insert(guestPayload);
      if (insertError) {
        setFeedback("Erro ao adicionar convidado.");
      } else {
        setGuestName("");
      }
    } finally {
      setSubmitting(false);
    }
    fetchAll();
  }

  async function handleRedraw() {
    if (!matchId || !activeGroupId || !canManage || !isPreparing) return;
    setRedrawing(true);
    setFeedback(null);
    try {
      const res = await supabase.functions.invoke("generate-lineup", { body: { matchId, groupId: activeGroupId } });
      if (res.error) throw res.error;
      setFeedback("Times sorteados novamente.");
    } catch (drawErr) {
      console.warn("Aviso: sorteio via edge function falhou, executando sorteio direto:", drawErr);
      const { success, error: drawError } = await performClientSideDraw(matchId);
      if (success) {
        setFeedback("Times sorteados novamente.");
      } else {
        setFeedback(drawError ?? "Erro ao sortear times.");
      }
    } finally {
      setRedrawing(false);
      fetchAll();
    }
  }

  async function handleAssignTeam(playerId: string, team: string) {
    if (!canManage || !isPreparing) return;
    const teamPayload = { team };
    await supabase.from("match_players").update(teamPayload).eq("id", playerId);
    fetchAll();
  }

  function handleSwapSelect(playerId: string) {
    setSwapSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 2) return prev;
      return [...prev, playerId];
    });
  }

  async function handleSwap() {
    if (!canManage || !isPreparing || swapSelected.length !== 2) return;
    const [a, b] = swapSelected;
    const pa = players.find((p) => p.id === a);
    const pb = players.find((p) => p.id === b);
    if (!pa || !pb || pa.team === pb.team) {
      setFeedback("Selecione dois jogadores de times diferentes para trocar.");
      setSwapSelected([]);
      return;
    }
    const teamPayloadA = { team: pb.team };
    const teamPayloadB = { team: pa.team };
    await Promise.all([
      supabase.from("match_players").update(teamPayloadA).eq("id", pa.id),
      supabase.from("match_players").update(teamPayloadB).eq("id", pb.id),
    ]);
    setSwapSelected([]);
    fetchAll();
  }

  if (error) {
    return <MatchErrorState message={error} />;
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  const isFull = match ? players.length >= match.max_players : false;
  const teamAName = match?.team_a_name ?? "Time A";
  const teamBName = match?.team_b_name ?? "Time B";
  const swapSelectedSet = new Set(swapSelected);

  return (
    <AppShell>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-surface-variant rounded-lg transition-colors"
            aria-label="Voltar"
          >
            <MaterialIcon name="arrow_back" className="w-5 h-5 text-on-surface-variant" />
          </button>
          <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter">
            {canManage ? "GERENCIAR JOGADORES" : "JOGADORES"}
          </h1>
        </div>

        {feedback && <p className="mb-4 px-4 py-3 bg-warning/10 text-warning font-mono text-label-sm border border-warning/30">{feedback}</p>}

        {canManage && isPreparing && <ActionsBar redrawing={redrawing} swapCount={swapSelected.length} onRedraw={handleRedraw} onSwap={handleSwap} />}

        <ConfirmedPlayersList
          players={players}
          maxPlayers={match?.max_players ?? "?"}
          canManage={canManage}
          isPreparing={isPreparing}
          swapSelectedSet={swapSelectedSet}
          teamAName={teamAName}
          teamBName={teamBName}
          onSwapSelect={handleSwapSelect}
          onAssignTeam={handleAssignTeam}
          onRemove={handleRemove}
        />

        {canManage && (
          <AddGuestSection
            isFull={isFull}
            playerCount={players.length}
            maxPlayers={match?.max_players ?? "?"}
            guestName={guestName}
            guestTeam={guestTeam}
            teamAName={teamAName}
            teamBName={teamBName}
            submitting={submitting}
            onGuestNameChange={setGuestName}
            onGuestTeamChange={setGuestTeam}
            onAddGuest={handleAddGuest}
          />
        )}

        {!canManage && (
          <p className="font-mono text-label-sm text-on-surface-variant text-center">Apenas o criador da partida pode gerenciar os jogadores.</p>
        )}
      </div>
    </AppShell>
  );
}
