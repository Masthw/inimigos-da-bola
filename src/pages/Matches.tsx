import { Link } from 'react-router-dom'
import { AppShell } from '../components/ui/AppShell'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Avatar } from '../components/ui/Avatar'
import { useMatches, type MatchWithMeta, type MatchPlayer, type PlayerStatus } from '../hooks/useMatches'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { getCourtPhotos } from '../lib/courts'

const PT_BR = 'pt-BR'

const dateFormatter = new Intl.DateTimeFormat(PT_BR, { weekday: 'long', day: 'numeric', month: 'long' })
const timeFormatter = new Intl.DateTimeFormat(PT_BR, { hour: '2-digit', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat(PT_BR, { day: '2-digit' })
const monthFormatter = new Intl.DateTimeFormat(PT_BR, { month: 'short' })
const shortDateFormatter = new Intl.DateTimeFormat(PT_BR, { day: '2-digit', month: '2-digit', year: 'numeric' })

const STATUS_META: Record<MatchWithMeta['status'], { label: string; className: string }> = {
  open: { label: 'AGENDADA', className: 'bg-secondary-container text-on-secondary-container' },
  in_progress: { label: 'AO VIVO', className: 'bg-error-container text-on-error-container' },
  finished: { label: 'FINALIZADA', className: 'bg-surface-variant text-on-surface-variant' },
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(iso: string): string {
  return capitalize(dateFormatter.format(new Date(iso)))
}

function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

function matchTitle(match: MatchWithMeta): string {
  return `${match.teamAName ?? 'Time A'} vs ${match.teamBName ?? 'Time B'}`
}

interface AttendanceButtonsProps {
  match: MatchWithMeta
  myStatus: PlayerStatus | undefined
  busy: boolean
  onConfirm: () => void
  onDesist: () => void
}

function AttendanceButtons({ match, myStatus, busy, onConfirm, onDesist }: Readonly<AttendanceButtonsProps>) {
  const isFull = match.confirmedCount >= match.maxPlayers
  const waitlistFull = match.waitlistCount >= match.maxWaitlist
  const buttonClass =
    'px-6 py-3 font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-2'

  if (myStatus === 'confirmed') {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled
          className={`${buttonClass} bg-green-800 text-white cursor-not-allowed`}
        >
          <MaterialIcon name="verified" className="w-5 h-5" />
          PRESENÇA CONFIRMADA
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDesist}
          className={`${buttonClass} bg-error text-on-error ${
            busy ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <MaterialIcon name="close" className="w-5 h-5" />
          DESISTIR
        </button>
      </div>
    )
  }

  if (myStatus === 'waitlist') {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled
          className={`${buttonClass} bg-tertiary-container text-on-tertiary-container cursor-not-allowed`}
        >
          <MaterialIcon name="pending" className="w-5 h-5" />
          NA LISTA DE ESPERA
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDesist}
          className={`${buttonClass} bg-error text-on-error ${
            busy ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <MaterialIcon name="close" className="w-5 h-5" />
          DESISTIR
        </button>
      </div>
    )
  }

  const waiting = isFull || match.status === 'in_progress'
  const confirmDisabled = busy || (waiting && waitlistFull)

  return (
    <button
      type="button"
      disabled={confirmDisabled}
      onClick={onConfirm}
      className={`${buttonClass} bg-primary-container text-primary ${
        confirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <MaterialIcon name={busy ? 'pending' : waiting ? 'schedule' : 'check_circle'} className="w-5 h-5" />
      {busy ? 'ENVIANDO...' : waiting ? (isFull ? 'ENTRAR NA ESPERA' : 'CONFIRMAR') : 'EU VOU!'}
    </button>
  )
}

function ConfirmedPlayersList({ players, waitlist }: Readonly<{ players: MatchPlayer[]; waitlist: MatchPlayer[] }>) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <div
            key={player.name}
            className="flex items-center gap-2 bg-surface-variant border border-outline-variant rounded-full pl-1 pr-3 py-1"
          >
            <Avatar src={player.avatarUrl} alt={player.name} className="w-7 h-7 rounded-full" />
            <span className="font-mono text-label-sm text-on-surface">{player.name}</span>
          </div>
        ))}
        {players.length === 0 && (
          <span className="font-mono text-label-sm text-on-surface-variant">
            Ninguém confirmado ainda — seja o primeiro!
          </span>
        )}
      </div>

      {waitlist.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-label-sm text-on-surface-variant uppercase tracking-widest">
              Lista de espera
            </span>
            <span className="font-mono text-label-bold text-tertiary">{waitlist.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {waitlist.map((player) => (
              <div
                key={player.name}
                className="flex items-center gap-2 bg-surface-variant/60 border border-tertiary/30 rounded-full pl-1 pr-3 py-1"
              >
                <Avatar src={player.avatarUrl} alt={player.name} className="w-7 h-7 rounded-full" />
                <span className="font-mono text-label-sm text-on-surface-variant">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FeaturedCard({ match, myStatus, busy, isAdmin, onConfirm, onDesist, onCancel }: Readonly<{
  match: MatchWithMeta
  myStatus: PlayerStatus | undefined
  busy: boolean
  isAdmin: boolean
  onConfirm: () => void
  onDesist: () => void
  onCancel: () => void
}>) {
  const hour = new Date(match.dateTime).getHours()
  const photos = getCourtPhotos(match.sportName, hour)
  const imageSrc = photos[0] ?? null
  const statusMeta = STATUS_META[match.status]
  const progress = Math.min(100, Math.round((match.confirmedCount / match.maxPlayers) * 100))

  return (
    <div className="relative overflow-hidden bg-surface-container-high rounded-xl border border-primary/30 flex flex-col md:flex-row transition-colors hover:border-primary/50">
      <div className="absolute left-0 top-0 w-1 h-full bg-primary" />

      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 font-mono text-label-sm uppercase tracking-widest ${statusMeta.className}`}>
              {match.status === 'in_progress' && <span className="w-2 h-2 rounded-full bg-error animate-pulse" />}
              {statusMeta.label}
            </span>
            {match.gameTypeName && (
              <span className="inline-flex px-3 py-1 font-mono text-label-sm uppercase tracking-widest bg-surface-variant text-on-surface-variant">
                {match.gameTypeName}
              </span>
            )}
            {isAdmin && match.status !== 'finished' && (
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 font-mono text-label-sm uppercase tracking-widest text-error bg-surface-container-highest border border-error/40 hover:bg-error/10 transition-colors"
              >
                <MaterialIcon name="close" className="w-3.5 h-3.5" />
                Cancelar Partida
              </button>
            )}
          </div>

          <h3 className="text-headline-md md:text-headline-lg font-display font-bold text-on-surface mb-stack-sm">
            {matchTitle(match)}
          </h3>

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
              <span className="font-mono text-label-sm text-on-surface-variant uppercase tracking-widest">
                Confirmados
              </span>
              <span className="font-mono text-label-bold text-primary">
                {match.confirmedCount}/{match.maxPlayers}
              </span>
            </div>
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-700 stat-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <AttendanceButtons
            match={match}
            myStatus={myStatus}
            busy={busy}
            onConfirm={onConfirm}
            onDesist={onDesist}
          />
        </div>
      </div>

      {imageSrc && (
        <div className="relative w-full md:w-2/5 h-56 md:h-auto shrink-0 overflow-hidden">
          <img className="absolute inset-0 w-full h-full object-cover" src={imageSrc} alt="Quadra" />
          <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-l from-surface-container-high via-surface-container-high/30 to-transparent" />
        </div>
      )}
    </div>
  )
}

function UpcomingRow({ match, myStatus, busy, onConfirm }: Readonly<{
  match: MatchWithMeta
  myStatus: PlayerStatus | undefined
  busy: boolean
  onConfirm: () => void
}>) {
  const date = new Date(match.dateTime)
  const isFull = match.confirmedCount >= match.maxPlayers
  const statusMeta = STATUS_META[match.status]

  return (
    <div className="bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-16 h-16 shrink-0 bg-surface-variant border border-outline-variant rounded-xl flex flex-col items-center justify-center overflow-hidden">
        <span className="text-2xl font-display font-bold text-primary leading-none">
          {dayFormatter.format(date)}
        </span>
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
            {isFull && match.status === 'open' && <span className="text-tertiary">(lotado)</span>}
          </span>
        </div>
      </div>

      <div className="sm:w-56">
        {myStatus === 'confirmed' ? (
          <span className="flex items-center justify-center gap-2 w-full py-2.5 px-4 font-mono text-label-sm text-green-400 bg-green-800/20 border border-green-700/40 rounded-none">
            <MaterialIcon name="verified" className="w-4 h-4" />
            CONFIRMADO
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`w-full py-2.5 px-4 font-mono text-label-sm brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-2 ${
              myStatus === 'waitlist' || myStatus === 'cancelled'
                ? 'bg-surface-container-highest text-on-surface-variant border border-outline-variant'
                : 'bg-primary-container text-primary'
            }`}
          >
            <MaterialIcon name={busy ? 'pending' : 'check_circle'} className="w-4 h-4" />
            {busy ? 'ENVIANDO...' : myStatus === 'waitlist' ? 'NA ESPERA' : 'CONFIRMAR'}
          </button>
        )}
      </div>
    </div>
  )
}

function FinishedRow({ match }: Readonly<{ match: MatchWithMeta }>) {
  const homeScore = match.teamAScore ?? 0
  const awayScore = match.teamBScore ?? 0
  const homeName = match.teamAName ?? 'Time A'
  const awayName = match.teamBName ?? 'Time B'
  const homeWon = homeScore > awayScore
  const awayWon = awayScore > homeScore

  return (
    <div className="bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant rounded-xl p-4 flex items-center gap-4">
      <div className="w-16 shrink-0 text-center">
        <span className="font-mono text-label-sm text-on-surface-variant">{shortDateFormatter.format(new Date(match.dateTime))}</span>
      </div>

      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
        <span className={`text-right truncate ${homeWon ? 'font-mono text-label-bold text-primary' : 'text-on-surface-variant'}`}>
          {homeName}
        </span>
        <div className="flex items-center gap-3 px-3 py-1.5 bg-surface-variant rounded-lg">
          <span className="display-lg text-on-surface leading-none">{homeScore}</span>
          <span className="text-on-surface-variant font-mono text-label-sm">x</span>
          <span className="display-lg text-on-surface leading-none">{awayScore}</span>
        </div>
        <span className={`truncate ${awayWon ? 'font-mono text-label-bold text-primary' : 'text-on-surface-variant'}`}>
          {awayName}
        </span>
      </div>

      <span className="hidden md:block px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest rounded-full bg-surface-variant text-on-surface-variant">
        {match.gameTypeName ?? 'PELADA'}
      </span>
    </div>
  )
}

export default function Matches() {
  const { featured, upcoming, finished, loading, busyMatchId, myStatus, setAttendance, cancelMatch } =
    useMatches()
  const { isAdmin } = useIsAdmin()

  const handleConfirm = (match: MatchWithMeta) => {
    const waiting = match.status === 'in_progress' || match.confirmedCount >= match.maxPlayers
    setAttendance(match.id, waiting ? 'waitlist' : 'confirmed')
  }

  const handleDesist = (match: MatchWithMeta) => {
    setAttendance(match.id, 'cancelled')
  }

  const handleCancel = (match: MatchWithMeta) => {
    if (window.confirm(`Cancelar a partida "${matchTitle(match)}"?`)) {
      cancelMatch(match.id)
    }
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 border-b border-outline-variant gap-4">
        <div className="min-w-0">
          <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">
            Partidas
          </h2>
          <p className="hidden md:block font-mono text-label-sm text-on-surface-variant">
            Agenda, presença e placares da equipe
          </p>
        </div>

        {isAdmin && (
          <Link
            to="/matches/new"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary-container text-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
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
                isAdmin={isAdmin}
                onConfirm={() => handleConfirm(featured)}
                onDesist={() => handleDesist(featured)}
                onCancel={() => handleCancel(featured)}
              />
            )}

            {upcoming.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MaterialIcon name="event_available" className="w-5 h-5 text-primary" />
                  <h3 className="font-mono text-label-bold uppercase tracking-widest text-on-surface-variant">
                    Próximas Partidas
                  </h3>
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
                  <h3 className="font-mono text-label-bold uppercase tracking-widest text-on-surface-variant">
                    Partidas Finalizadas
                  </h3>
                </div>
                <div className="space-y-3">
                  {finished.map((match) => (
                    <FinishedRow key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}

            {!featured && upcoming.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center border border-outline-variant rounded-xl bg-surface-container">
                <MaterialIcon name="sports_soccer" className="w-12 h-12 text-on-surface-variant mb-4" />
                <h3 className="text-headline-md font-display text-on-surface uppercase mb-2">
                  Nenhuma partida marcada
                </h3>
                <p className="font-body text-on-surface-variant max-w-sm mb-6">
                  Assim que uma pelada for agendada, ela aparece aqui com status e contagem de presença em tempo real.
                </p>
                {isAdmin && (
                  <Link
                    to="/matches/new"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform"
                  >
                    <MaterialIcon name="add_circle" className="w-5 h-5" />
                    Criar Primeira Partida
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
