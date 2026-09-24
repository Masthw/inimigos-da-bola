import type { SyntheticEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { Avatar } from "../components/ui/Avatar";
import { MatchErrorState } from "../components/match/MatchErrorState";
import { useActiveGroup } from "../hooks/useActiveGroup";
import {
  useMatchPlayersManagement,
  type GroupMemberRow,
  type MatchPlayerRow,
} from "../hooks/useMatchPlayersManagement";

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
  onAddGuest: (e: SyntheticEvent) => void;
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

function CapacitySection({
  confirmedCount,
  maxPlayers,
  value,
  busy,
  error,
  onValueChange,
  onSubmit,
}: Readonly<{
  confirmedCount: number;
  maxPlayers: number | string;
  value: string;
  busy: boolean;
  error: string | null;
  onValueChange: (val: string) => void;
  onSubmit: (e: SyntheticEvent) => void;
}>) {
  return (
    <section className="p-4 bg-surface-container-high border border-outline-variant rounded-xl mb-8">
      <h2 className="text-title-md font-mono text-on-surface mb-1">Capacidade da partida</h2>
      <p className="font-mono text-label-sm text-on-surface-variant mb-3">
        {confirmedCount} confirmado(s) de {maxPlayers} — a lista de espera é livre (sem limite).
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="capacity" className="block text-label-sm font-mono text-on-surface-variant mb-1">
            Total de jogadores
          </label>
          <input
            id="capacity"
            type="number"
            min={confirmedCount}
            max={99}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full px-4 py-3 bg-surface-container border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
            required
          />
          {error && <span className="font-mono text-[10px] text-error">{error}</span>}
        </div>
        <button
          type="submit"
          disabled={busy || !value}
          className="w-full py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <MaterialIcon name="pending" className="w-5 h-5 animate-spin" /> : <MaterialIcon name="groups" className="w-5 h-5" />}
          {busy ? "ATUALIZANDO..." : "ATUALIZAR CAPACIDADE"}
        </button>
        <p className="font-mono text-[10px] text-on-surface-variant">
          Se aumentar, jogadores da lista de espera entram automaticamente (1 por vaga, no time com menos jogadores).
          Só pode ser alterada em partidas abertas ou em preparação.
        </p>
      </form>
    </section>
  );
}

function AddMemberSection({
  isFull,
  members,
  selectedUserId,
  busy,
  onUserChange,
  onSubmit,
}: Readonly<{
  isFull: boolean;
  members: GroupMemberRow[];
  selectedUserId: string;
  busy: boolean;
  onUserChange: (val: string) => void;
  onSubmit: (e: SyntheticEvent) => void;
}>) {
  return (
    <section className="p-4 bg-surface-container-high border border-outline-variant rounded-xl mb-8">
      <h2 className="text-title-md font-mono text-on-surface mb-1">Adicionar membro do grupo</h2>
      {isFull ? (
        <p className="font-mono text-label-sm text-warning mb-3">
          Partida cheia — o membro entrará na lista de espera.
        </p>
      ) : (
        <p className="font-mono text-label-sm text-on-surface-variant mb-3">
          Com vaga, o membro entra como confirmado no time com menos jogadores.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="member-user" className="block text-label-sm font-mono text-on-surface-variant mb-1">
            Membro
          </label>
          <select
            id="member-user"
            value={selectedUserId}
            onChange={(e) => onUserChange(e.target.value)}
            className="w-full px-4 py-3 bg-surface-container border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
            required
          >
            <option value="">Selecione um membro</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id ?? ""}>
                {member.users?.name ?? "Membro"}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy || !selectedUserId}
          className="w-full py-3 bg-secondary-container text-on-secondary-container font-mono text-label-bold border border-outline-variant transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <MaterialIcon name="pending" className="w-5 h-5 animate-spin" /> : <MaterialIcon name="person_add" className="w-5 h-5" />}
          {busy ? "ADICIONANDO..." : isFull ? "ADICIONAR À ESPERA" : "ADICIONAR MEMBRO"}
        </button>
        <p className="font-mono text-[10px] text-on-surface-variant">
          Sem vaga, entra na lista de espera (sem limite) e entra quando alguém desistir.
        </p>
      </form>
    </section>
  );
}

function ManagementSections({
  canManage,
  isFull,
  playersCount,
  maxPlayers,
  teamAName,
  teamBName,
  availableMembers,
  capacity,
  member,
  guest,
}: Readonly<{
  canManage: boolean;
  isFull: boolean;
  playersCount: number;
  maxPlayers: number | string;
  teamAName: string;
  teamBName: string;
  availableMembers: GroupMemberRow[];
  capacity: {
    value: string;
    busy: boolean;
    error: string | null;
    onValueChange: (val: string) => void;
    onSubmit: (e: SyntheticEvent) => void;
  };
  member: {
    selectedUserId: string;
    busy: boolean;
    onUserChange: (val: string) => void;
    onSubmit: (e: SyntheticEvent) => void;
  };
  guest: {
    guestName: string;
    guestTeam: string;
    submitting: boolean;
    onGuestNameChange: (val: string) => void;
    onGuestTeamChange: (val: string) => void;
    onAddGuest: (e: SyntheticEvent) => void;
  };
}>) {
  if (!canManage) {
    return (
      <p className="font-mono text-label-sm text-on-surface-variant text-center">
        Apenas o criador da partida pode gerenciar os jogadores.
      </p>
    );
  }

  return (
    <>
      <CapacitySection
        confirmedCount={playersCount}
        maxPlayers={maxPlayers}
        value={capacity.value}
        busy={capacity.busy}
        error={capacity.error}
        onValueChange={capacity.onValueChange}
        onSubmit={capacity.onSubmit}
      />

      <AddMemberSection
        isFull={isFull}
        members={availableMembers}
        selectedUserId={member.selectedUserId}
        busy={member.busy}
        onUserChange={member.onUserChange}
        onSubmit={member.onSubmit}
      />

      <AddGuestSection
        isFull={isFull}
        playerCount={playersCount}
        maxPlayers={maxPlayers}
        guestName={guest.guestName}
        guestTeam={guest.guestTeam}
        teamAName={teamAName}
        teamBName={teamBName}
        submitting={guest.submitting}
        onGuestNameChange={guest.onGuestNameChange}
        onGuestTeamChange={guest.onGuestTeamChange}
        onAddGuest={guest.onAddGuest}
      />
    </>
  );
}

export default function MatchPlayersManagement() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { activeGroupId } = useActiveGroup();
  const store = useMatchPlayersManagement(matchId, activeGroupId);

  if (store.error) {
    return <MatchErrorState message={store.error} />;
  }

  if (store.loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  const teamAName = store.match?.team_a_name ?? "Time A";
  const teamBName = store.match?.team_b_name ?? "Time B";
  const swapSelectedSet = new Set(store.swap.swapSelected);
  const inMatchUserIds = new Set(
    [...store.players, ...store.waitlist].map((p) => p.user_id).filter((id): id is string => Boolean(id)),
  );
  const availableMembers = store.groupMembers.filter(
    (m) => m.user_id != null && !inMatchUserIds.has(m.user_id),
  );

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
            {store.canManage ? "GERENCIAR JOGADORES" : "JOGADORES"}
          </h1>
        </div>

        {store.feedback && <p className="mb-4 px-4 py-3 bg-warning/10 text-warning font-mono text-label-sm border border-warning/30">{store.feedback}</p>}

        {store.canManage && store.isPreparing && (
          <ActionsBar
            redrawing={store.lineup.redrawing}
            swapCount={store.swap.swapSelected.length}
            onRedraw={store.lineup.handleRedraw}
            onSwap={store.swap.handleSwap}
          />
        )}

        <ConfirmedPlayersList
          players={store.players}
          maxPlayers={store.match?.max_players ?? "?"}
          canManage={store.canManage}
          isPreparing={store.isPreparing}
          swapSelectedSet={swapSelectedSet}
          teamAName={teamAName}
          teamBName={teamBName}
          onSwapSelect={store.swap.handleSwapSelect}
          onAssignTeam={store.playerActions.handleAssignTeam}
          onRemove={store.playerActions.handleRemove}
        />

        <ManagementSections
          canManage={store.canManage}
          isFull={store.isFull}
          playersCount={store.players.length}
          maxPlayers={store.match?.max_players ?? "?"}
          teamAName={teamAName}
          teamBName={teamBName}
          availableMembers={availableMembers}
          capacity={{
            value: store.capacity.capacityInput,
            busy: store.capacity.capacityBusy,
            error: store.capacity.capacityError,
            onValueChange: store.capacity.setCapacityInput,
            onSubmit: store.capacity.handleUpdateCapacity,
          }}
          member={{
            selectedUserId: store.member.memberUserId,
            busy: store.member.memberBusy,
            onUserChange: store.member.setMemberUserId,
            onSubmit: store.member.handleAddMember,
          }}
          guest={{
            guestName: store.guest.guestName,
            guestTeam: store.guest.guestTeam,
            submitting: store.guest.submitting,
            onGuestNameChange: store.guest.setGuestName,
            onGuestTeamChange: store.guest.setGuestTeam,
            onAddGuest: store.guest.handleAddGuest,
          }}
        />
      </div>
    </AppShell>
  );
}