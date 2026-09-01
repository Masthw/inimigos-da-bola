import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { Avatar } from "../components/ui/Avatar";
import { Modal } from "../components/ui/Modal";
import { LiveMatchView } from "../components/match/LiveMatchView";
import { FinishedMatchCard } from "../components/match/FinishedMatchCard";
import { useMatches, type MatchWithMeta, type MatchPlayer, type PlayerStatus } from "../hooks/useMatches";
import { useLiveMatch } from "../hooks/useLiveMatch";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { getCourtPhotos } from "../lib/courts";

const PT_BR = "pt-BR";

const dateFormatter = new Intl.DateTimeFormat(PT_BR, { weekday: "long", day: "numeric", month: "long" });
const timeFormatter = new Intl.DateTimeFormat(PT_BR, { hour: "2-digit", minute: "2-digit" });
const dayFormatter = new Intl.DateTimeFormat(PT_BR, { day: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat(PT_BR, { month: "short" });

const STATUS_META: Record<MatchWithMeta["status"], { label: string; className: string }> = {
  open: { label: "AGENDADA", className: "bg-secondary-container text-on-secondary-container" },
  in_progress: { label: "AO VIVO", className: "bg-error-container text-on-error-container" },
  voting: { label: "VOTAÇÃO ABERTA", className: "bg-primary-container text-on-primary-container" },
  finished: { label: "FINALIZADA", className: "bg-surface-variant text-on-surface-variant" },
  cancelled: { label: "CANCELADA", className: "bg-error text-on-error" },
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(iso: string): string {
  return capitalize(dateFormatter.format(new Date(iso)));
}

function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

function matchTitle(match: MatchWithMeta): string {
  return `${match.teamAName ?? "Time A"} vs ${match.teamBName ?? "Time B"}`;
}

interface AttendanceButtonsProps {
  match: MatchWithMeta;
  myStatus: PlayerStatus | undefined;
  busy: boolean;
  onConfirm: () => void;
  onDesist: () => void;
}

function AttendanceButtons({ match, myStatus, busy, onConfirm, onDesist }: Readonly<AttendanceButtonsProps>) {
  const isFull = match.confirmedCount >= match.maxPlayers;
  const waitlistFull = match.waitlistCount >= match.maxWaitlist;
  const buttonClassBase =
    "px-6 py-3 font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-2";

  if (myStatus === "confirmed") {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" disabled className={`${buttonClassBase} bg-green-800 text-white cursor-not-allowed`}>
          <MaterialIcon name="verified" className="w-5 h-5" />
          PRESENÇA CONFIRMADA
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDesist}
          className={`${buttonClassBase} bg-error text-on-error ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <MaterialIcon name="close" className="w-5 h-5" />
          DESISTIR
        </button>
      </div>
    );
  }

  if (myStatus === "waitlist") {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" disabled className={`${buttonClassBase} bg-tertiary-container text-on-tertiary-container cursor-not-allowed`}>
          <MaterialIcon name="pending" className="w-5 h-5" />
          NA LISTA DE ESPERA
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDesist}
          className={`${buttonClassBase} bg-error text-on-error ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <MaterialIcon name="close" className="w-5 h-5" />
          DESISTIR
        </button>
      </div>
    );
  }

  const waiting = isFull || match.status === "in_progress";
  const confirmDisabled = busy || (waiting && waitlistFull);

  let iconName = "check_circle";
  let buttonText = "EU VOU!";

  if (busy) {
    iconName = "pending";
    buttonText = "ENVIANDO...";
  } else if (waiting) {
    iconName = "schedule";
    buttonText = isFull ? "ENTRAR NA ESPERA" : "CONFIRMAR";
  }

  return (
    <button
      type="button"
      disabled={confirmDisabled}
      onClick={onConfirm}
      className={`${buttonClassBase} bg-primary-container text-primary ${confirmDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <MaterialIcon name={iconName} className="w-5 h-5" />
      {buttonText}
    </button>
  );
}

function ConfirmedPlayersList({ players, waitlist }: Readonly<{ players: MatchPlayer[]; waitlist: MatchPlayer[] }>) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <div key={player.name} className="flex items-center gap-2 bg-surface-variant border border-outline-variant rounded-full pl-1 pr-3 py-1">
            <Avatar src={player.avatarUrl} alt={player.name} className="w-7 h-7 rounded-full" />
            <span className="font-mono text-label-sm text-on-surface">{player.name}</span>
          </div>
        ))}
        {players.length === 0 && <span className="font-mono text-label-sm text-on-surface-variant">Ninguém confirmado ainda — seja o primeiro!</span>}
      </div>

      {waitlist.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-label-sm text-on-surface-variant uppercase tracking-widest">Lista de espera</span>
            <span className="font-mono text-label-bold text-tertiary">{waitlist.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {waitlist.map((player) => (
              <div key={player.name} className="flex items-center gap-2 bg-surface-variant/60 border border-tertiary/30 rounded-full pl-1 pr-3 py-1">
                <Avatar src={player.avatarUrl} alt={player.name} className="w-7 h-7 rounded-full" />
                <span className="font-mono text-label-sm text-on-surface-variant">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturedCard({
  match,
  myStatus,
  busy,
  isAdmin,
  onConfirm,
  onDesist,
  onCancel,
  onStart,
}: Readonly<{
  match: MatchWithMeta;
  myStatus: PlayerStatus | undefined;
  busy: boolean;
  isAdmin: boolean;
  onConfirm: () => void;
  onDesist: () => void;
  onCancel: () => void;
  onStart: () => void;
}>) {
  const hour = new Date(match.dateTime).getHours();
  const photos = getCourtPhotos(match.sportName, hour);
  const imageSrc = photos[0] ?? null;
  const statusMeta = STATUS_META[match.status];
  const progress = Math.min(100, Math.round((match.confirmedCount / match.maxPlayers) * 100));

  const isPlayableStatus = match.status === "open" || match.status === "in_progress";

  return (
    <div className="relative overflow-hidden bg-surface-container-high rounded-xl border border-primary/30 flex flex-col md:flex-row transition-colors hover:border-primary/50">
      <div className="absolute left-0 top-0 w-1 h-full bg-primary" />

      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 font-mono text-label-sm uppercase tracking-widest ${statusMeta.className}`}>
              {match.status === "in_progress" && <span className="w-2 h-2 rounded-full bg-error animate-pulse" />}
              {statusMeta.label}
            </span>
            {match.gameTypeName && (
              <span className="inline-flex px-3 py-1 font-mono text-label-sm uppercase tracking-widest bg-surface-variant text-on-surface-variant">
                {match.gameTypeName}
              </span>
            )}

            {isAdmin && isPlayableStatus && (
              <div className="ml-auto flex items-center gap-2">
                {match.status === "open" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onStart}
                    className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-label-sm uppercase tracking-widest text-success bg-success/10 border border-success/40 hover:bg-success/20 transition-colors"
                  >
                    <MaterialIcon name="play_arrow" className="w-3.5 h-3.5" />
                    Iniciar
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={onCancel}
                  className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-label-sm uppercase tracking-widest text-error bg-surface-container-highest border border-error/40 hover:bg-error/10 transition-colors"
                >
                  <MaterialIcon name="close" className="w-3.5 h-3.5" />
                  Cancelar Partida
                </button>
              </div>
            )}
          </div>

          <h3 className="text-headline-md md:text-headline-lg font-display font-bold text-on-surface mb-stack-sm">{matchTitle(match)}</h3>

          <div className="space-y-2.5 mt-4">
            <div className="flex items-center gap-3 text-on-surface-variant">
              <MaterialIcon name="calendar_today" className="w-5 h-5 text-primary" />
              <span className="font-body">{formatDate(match.dateTime)}</span>
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant">
              <MaterialIcon name="schedule" className="w-5 h-5 text-primary" />
              <span className="font-body">{formatTime(match.dateTime)}</span>
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant">
              <MaterialIcon name="location_on" className="w-5 h-5 text-primary" />
              <span className="font-body">{match.location}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant/30">
          <ConfirmedPlayersList players={match.confirmedPlayers} waitlist={match.waitlistPlayers} />
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-label-sm text-on-surface-variant uppercase tracking-widest">Confirmados</span>
              <span className="font-mono text-label-bold text-primary">
                {match.confirmedCount}/{match.maxPlayers}
              </span>
            </div>
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-[width] duration-700 stat-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {match.status === "voting" && (
            <Link
              to={`/matches/${match.id}/vote`}
              className="w-full py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-2"
            >
              <MaterialIcon name="how_to_vote" className="w-5 h-5" />
              VOTAR NOS CRAQUES
            </Link>
          )}

          {isPlayableStatus && <AttendanceButtons match={match} myStatus={myStatus} busy={busy} onConfirm={onConfirm} onDesist={onDesist} />}
        </div>
      </div>

      {imageSrc && (
        <div className="relative w-full md:w-2/5 h-56 md:h-auto shrink-0 overflow-hidden">
          <img className="absolute inset-0 w-full h-full object-cover" src={imageSrc} alt="Quadra" />
          <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-l from-surface-container-high via-surface-container-high/30 to-transparent" />
        </div>
      )}
    </div>
  );
}

const UpcomingRow = React.memo(function UpcomingRow({
  match,
  myStatus,
  busy,
  onConfirm,
}: Readonly<{
  match: MatchWithMeta;
  myStatus: PlayerStatus | undefined;
  busy: boolean;
  onConfirm: () => void;
}>) {
  const date = new Date(match.dateTime);
  const isFull = match.confirmedCount >= match.maxPlayers;
  const statusMeta = STATUS_META[match.status];

  let iconName = "check_circle";
  let buttonText = "CONFIRMAR";
  let buttonBgClass = "bg-primary-container text-primary";

  if (busy) {
    iconName = "pending";
    buttonText = "ENVIANDO...";
  } else if (myStatus === "waitlist") {
    buttonText = "NA ESPERA";
  }

  if (myStatus === "waitlist" || myStatus === "cancelled") {
    buttonBgClass = "bg-surface-container-highest text-on-surface-variant border border-outline-variant";
  }

  return (
    <div className="bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-16 h-16 shrink-0 bg-surface-variant border border-outline-variant rounded-xl flex flex-col items-center justify-center overflow-hidden">
        <span className="text-2xl font-display font-bold text-primary leading-none">{dayFormatter.format(date)}</span>
        <span className="font-mono text-[10px] text-on-surface-variant uppercase leading-none mt-1 w-full text-center truncate px-1">
          {monthFormatter.format(date)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-mono text-label-bold text-on-surface truncate">{matchTitle(match)}</h4>
          <span className={`shrink-0 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest rounded-full ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <MaterialIcon name="schedule" className="w-4 h-4 text-primary" />
            {formatTime(match.dateTime)}
          </span>
          <span className="flex items-center gap-1.5">
            <MaterialIcon name="location_on" className="w-4 h-4 text-primary" />
            {match.location}
          </span>
          <span className="flex items-center gap-1.5">
            <MaterialIcon name="person" className="w-4 h-4 text-primary" />
            {match.confirmedCount}/{match.maxPlayers}
            {isFull && match.status === "open" && <span className="text-tertiary">(lotado)</span>}
          </span>
        </div>
      </div>

      <div className="sm:w-56">
        {myStatus === "confirmed" ? (
          <span className="flex items-center justify-center gap-2 w-full py-2.5 px-4 font-mono text-label-sm text-green-400 bg-green-800/20 border border-green-700/40 rounded-none">
            <MaterialIcon name="verified" className="w-4 h-4" />
            CONFIRMADO
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`w-full py-2.5 px-4 font-mono text-label-sm brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-2 ${buttonBgClass}`}
          >
            <MaterialIcon name={iconName} className="w-4 h-4" />
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
});

export default function Matches() {
  const { activeGroupId } = useActiveGroup();
  const { featured, upcoming, finished, loading, busyMatchId, myStatus, setAttendance, cancelMatch, refetch } = useMatches(activeGroupId);
  const { isGroupAdmin } = useIsAdmin();
  const { busy: liveBusy, startMatch, addGoal, addOwnGoal } = useLiveMatch(activeGroupId);
  const navigate = useNavigate();
  const [cancelModalMatch, setCancelModalMatch] = useState<MatchWithMeta | null>(null);
  const [startModalMatch, setStartModalMatch] = useState<MatchWithMeta | null>(null);
  const [expandedFinished, setExpandedFinished] = useState<string | null>(null);

  const handleConfirm = (match: MatchWithMeta) => {
    const waiting = match.status === "in_progress" || match.confirmedCount >= match.maxPlayers;
    setAttendance(match.id, waiting ? "waitlist" : "confirmed");
  };

  const handleDesist = (match: MatchWithMeta) => {
    setAttendance(match.id, "cancelled");
  };

  const handleCancelConfirm = () => {
    if (!cancelModalMatch) return;
    cancelMatch(cancelModalMatch.id);
    setCancelModalMatch(null);
  };

  const handleStartConfirm = async () => {
    if (!startModalMatch) return;
    await startMatch(startModalMatch.id);
    setStartModalMatch(null);
    refetch();
  };

  const isInProgress = featured?.status === "in_progress";

  const handleGoalScored = async (scorer: MatchPlayer, assist: MatchPlayer | null) => {
    if (!featured) return;
    await addGoal(featured.id, scorer.userId ?? "", scorer.team ?? "A", assist?.userId || null);
    refetch();
  };

  const handleOwnGoal = async (teamBenefited: string, scorerUserId: string | null) => {
    if (!featured) return;
    await addOwnGoal(featured.id, teamBenefited, scorerUserId);
    refetch();
  };


  return (
    <AppShell>
      {isInProgress && featured ? (
        <LiveMatchView
          matchId={featured.id}
          teamAName={featured.teamAName ?? "Time A"}
          teamBName={featured.teamBName ?? "Time B"}
          teamAColor={featured.teamAColor ?? "#ef4444"}
          teamBColor={featured.teamBColor ?? "#3b82f6"}
          teamAScore={featured.teamAScore ?? 0}
          teamBScore={featured.teamBScore ?? 0}
          teamAPlayers={featured.confirmedPlayers.filter((p) => p.team === "A")}
          teamBPlayers={featured.confirmedPlayers.filter((p) => p.team === "B")}
          onGoalScored={handleGoalScored}
          onOwnGoal={handleOwnGoal}
          onRequestReview={() => navigate(`/matches/${featured.id}/review`)}
          busy={liveBusy}
        />
      ) : (
        <>
          <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 border-b border-outline-variant gap-4">
            <div className="min-w-0">
              <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">Partidas</h2>
            </div>

            {isGroupAdmin && (
              <Link
                to="/matches/new"
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
              >
                <MaterialIcon name="add_circle" className="w-5 h-5" />
                Novo Jogo
              </Link>
            )}
          </header>

          <div className="p-4 md:p-margin-desktop space-y-8">
            {loading ? (
              <div className="space-y-4">
                <div className="h-72 md:h-80 bg-surface-container-high border border-outline-variant rounded-xl animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 w-40 bg-surface-variant rounded animate-pulse" />
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-20 bg-surface-container rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {featured && (
                  <FeaturedCard
                    match={featured}
                    myStatus={myStatus[featured.id]}
                    busy={busyMatchId === featured.id}
                    isAdmin={isGroupAdmin}
                    onConfirm={() => handleConfirm(featured)}
                    onDesist={() => handleDesist(featured)}
                    onCancel={() => setCancelModalMatch(featured)}
                    onStart={() => setStartModalMatch(featured)}
                  />
                )}

                {upcoming.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <MaterialIcon name="event_available" className="w-5 h-5 text-primary" />
                      <h3 className="font-mono text-label-bold uppercase tracking-widest text-on-surface-variant">Próximas Partidas</h3>
                      <span className="px-2 py-0.5 font-mono text-label-sm bg-surface-variant text-on-surface-variant rounded-full">
                        {upcoming.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {upcoming.map((match) => (
                        <UpcomingRow
                          key={match.id}
                          match={match}
                          myStatus={myStatus[match.id]}
                          busy={busyMatchId === match.id}
                          onConfirm={() => handleConfirm(match)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {finished.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <MaterialIcon name="history" className="w-5 h-5 text-primary" />
                      <h3 className="font-mono text-label-bold uppercase tracking-widest text-on-surface-variant">Partidas Finalizadas</h3>
                    </div>
                    <div className="space-y-3">
                      {finished.map((match) => (
                        <FinishedMatchCard
                          key={match.id}
                          matchId={match.id}
                          dateTime={match.dateTime}
                          gameTypeName={match.gameTypeName}
                          teamAName={match.teamAName ?? "Time A"}
                          teamBName={match.teamBName ?? "Time B"}
                          teamAScore={match.teamAScore ?? 0}
                          teamBScore={match.teamBScore ?? 0}
                          teamAPlayers={match.teamAPlayers}
                          teamBPlayers={match.teamBPlayers}
                          expanded={expandedFinished === match.id}
                          onToggle={() => setExpandedFinished(expandedFinished === match.id ? null : match.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {!featured && upcoming.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-center border border-outline-variant rounded-xl bg-surface-container">
                    <MaterialIcon name="sports_soccer" className="w-12 h-12 text-on-surface-variant mb-4" />
                    <h3 className="text-headline-md font-display text-on-surface uppercase mb-2">Nenhuma partida marcada</h3>
                    <p className="font-body text-on-surface-variant max-w-sm mb-6">
                      Assim que uma pelada for agendada, ela aparece aqui com status e contagem de presença em tempo real.
                    </p>
                    {isGroupAdmin && (
                      <div className="flex items-center flex-col sm:flex-row gap-3">
                        <Link
                          to="/matches/new"
                          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary  font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
                        >
                          <MaterialIcon name="add_circle" className="w-5 h-5" />
                          Criar Partida
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      <Modal
        open={!!cancelModalMatch}
        onClose={() => setCancelModalMatch(null)}
        title="Cancelar Partida"
        icon="close"
        actions={
          <>
            <button
              type="button"
              onClick={() => setCancelModalMatch(null)}
              className="px-5 py-2.5 font-mono text-label-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={busyMatchId === cancelModalMatch?.id}
              onClick={handleCancelConfirm}
              className="px-6 py-2.5 bg-error text-on-error font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
            >
              {busyMatchId === cancelModalMatch?.id ? "Cancelando..." : "Sim, Cancelar"}
            </button>
          </>
        }
      >
        <p className="font-body text-on-surface-variant">
          Tem certeza que deseja cancelar a partida{" "}
          <strong className="text-on-surface">{cancelModalMatch ? matchTitle(cancelModalMatch) : ""}</strong>?
        </p>
        <p className="font-mono text-label-sm text-on-surface-variant mt-2">Todos os jogadores confirmados perderão a presença.</p>
      </Modal>

      <Modal
        open={!!startModalMatch}
        onClose={() => setStartModalMatch(null)}
        title="Iniciar Partida"
        icon="play_arrow"
        actions={
          <>
            <button
              type="button"
              onClick={() => setStartModalMatch(null)}
              className="px-5 py-2.5 font-mono text-label-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={liveBusy}
              onClick={handleStartConfirm}
              className="px-6 py-2.5 bg-success text-white font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
            >
              {liveBusy ? "Iniciando..." : "Sim, Iniciar"}
            </button>
          </>
        }
      >
        <p className="font-body text-on-surface-variant">
          Iniciar a partida <strong className="text-on-surface">{startModalMatch ? matchTitle(startModalMatch) : ""}</strong>?
        </p>
        <p className="font-mono text-label-sm text-on-surface-variant mt-2">A partida ficará "Ao Vivo" e o placar começará em 0x0.</p>
      </Modal>
    </AppShell>
  );
}
