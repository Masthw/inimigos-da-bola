import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { Button } from "../components/ui/Button";
import { Dropdown } from "../components/ui/Dropdown";
import { InputField } from "../components/ui/InputField";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { TimePicker } from "../components/ui/TimePicker";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { supabase } from "../lib/supabaseClient";

interface GameType {
  id: number;
  name: string;
  default_max_players: number;
  default_max_waitlist: number;
}

const inputClass =
  "flex items-center gap-3 px-4 py-3 bg-surface-container-high border border-outline-variant focus-within:border-primary transition-colors";

const labelClass = "label-bold text-on-surface-variant uppercase tracking-wider";

function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const TODAY = todayString();

function NewMatchAccessRestricted() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-margin-mobile md:px-margin-desktop pt-16 text-center">
        <MaterialIcon name="lock" className="w-10 h-10 text-on-surface-variant mx-auto mb-4" />
        <h2 className="text-headline-md font-display uppercase text-on-surface mb-2">Acesso Restrito</h2>
        <p className="font-mono text-label-sm text-on-surface-variant">Apenas administradores podem criar partidas.</p>
      </div>
    </AppShell>
  );
}

function NewMatchScheduleSection({
  date,
  dateHint,
  timeHour,
  timeMinute,
  onDateChange,
  onHourChange,
  onMinuteChange,
}: Readonly<{
  date: string;
  dateHint?: string;
  timeHour: string;
  timeMinute: string;
  onDateChange: (val: string) => void;
  onHourChange: (val: string) => void;
  onMinuteChange: (val: string) => void;
}>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="date">
          Data
        </label>
        <div className={inputClass}>
          <MaterialIcon name="calendar_today" className="w-5 h-5 text-on-surface-variant" />
          <input
            id="date"
            type="date"
            min={TODAY}
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="flex-1 bg-transparent text-on-surface font-body focus:outline-none scheme-dark"
          />
        </div>
        {dateHint && (
          <span className="font-mono text-[10px] text-warning flex items-center gap-1">
            <MaterialIcon name="schedule" className="w-3.5 h-3.5" />
            {dateHint}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="time">
          Hora
        </label>
        <TimePicker hour={timeHour} minute={timeMinute} onHourChange={onHourChange} onMinuteChange={onMinuteChange} />
      </div>
    </div>
  );
}

function NewMatchPlayersConfig({
  maxPlayers,
  maxWaitlist,
  fieldError,
  hint,
  onMaxPlayersChange,
  onMaxPlayersBlur,
  onMaxWaitlistChange,
}: Readonly<{
  maxPlayers: string;
  maxWaitlist: string;
  fieldError?: string;
  hint?: string;
  onMaxPlayersChange: (val: string) => void;
  onMaxPlayersBlur: () => void;
  onMaxWaitlistChange: (val: string) => void;
}>) {
  const perTeamLabel = Number(maxPlayers) > 0 ? `${Math.ceil(Number(maxPlayers) / 2)} por time` : "";
  const infoLabel = hint ? `${hint} — ${perTeamLabel}` : perTeamLabel;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="max-players">
          Total de Jogadores
        </label>
        <div className={`${inputClass} ${fieldError ? "border-error" : ""}`}>
          <MaterialIcon name="person" className="w-5 h-5 text-on-surface-variant" />
          <input
            id="max-players"
            type="number"
            min={2}
            value={maxPlayers}
            onChange={(event) => onMaxPlayersChange(event.target.value)}
            onBlur={onMaxPlayersBlur}
            className="flex-1 bg-transparent text-on-surface font-body focus:outline-none"
          />
        </div>
        {fieldError ? (
          <span className="font-mono text-[10px] text-error">{fieldError}</span>
        ) : (
          <span className="font-mono text-[10px] text-on-surface-variant">{infoLabel}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="max-waitlist">
          Lista de Espera
        </label>
        <div className={inputClass}>
          <MaterialIcon name="pending" className="w-5 h-5 text-on-surface-variant" />
          <input
            id="max-waitlist"
            type="number"
            min={0}
            value={maxWaitlist}
            onChange={(event) => onMaxWaitlistChange(event.target.value)}
            className="flex-1 bg-transparent text-on-surface font-body focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function NewMatchTeamNamesSection({
  teamAName,
  teamBName,
  onTeamAChange,
  onTeamBChange,
}: Readonly<{
  teamAName: string;
  teamBName: string;
  onTeamAChange: (val: string) => void;
  onTeamBChange: (val: string) => void;
}>) {
  return (
    <div className="border-t border-outline-variant/20 pt-6">
      <p className="font-mono text-label-sm uppercase text-on-surface-variant tracking-widest mb-4">Nomes dos Times (opcional)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
        <InputField label="Time A" icon="sports_soccer" placeholder="Ex.: Inimigos da Bola" value={teamAName} onChange={onTeamAChange} />
        <InputField label="Time B" icon="sports_soccer" placeholder="Ex.: Grêmio" value={teamBName} onChange={onTeamBChange} />
      </div>
    </div>
  );
}

export default function NewMatch() {
  const { user } = useAuth();
  const { isGroupAdmin, loading: adminLoading } = useIsAdmin();
  const { activeGroupId } = useActiveGroup();
  const navigate = useNavigate();

  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [gameTypeId, setGameTypeId] = useState("");
  const [date, setDate] = useState("");
  const [timeHour, setTimeHour] = useState("");
  const [timeMinute, setTimeMinute] = useState("");
  const [location, setLocation] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("12");
  const [maxWaitlist, setMaxWaitlist] = useState("2");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ maxPlayers?: string }>({});
  const [hints, setHints] = useState<{ maxPlayers?: string; date?: string }>({});

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("game_types")
      .select("id, name, default_max_players, default_max_waitlist")
      .order("name")
      .then(({ data, error: loadError }) => {
        if (cancelled || loadError || !data) return;
        setGameTypes(data);
        if (data.length > 0) {
          const first = data[0];
          setGameTypeId(String(first.id));
          setMaxPlayers(String(first.default_max_players));
          setMaxWaitlist(String(first.default_max_waitlist));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleGameTypeChange(value: string) {
    setGameTypeId(value);
    const selected = gameTypes.find((gameType) => String(gameType.id) === value);
    if (selected) {
      setMaxPlayers(String(selected.default_max_players));
      setMaxWaitlist(String(selected.default_max_waitlist));
      setHints((prev) => ({
        ...prev,
        maxPlayers: `Limite de ${selected.default_max_players} para ${selected.name}`,
      }));
      setFieldErrors((prev) => ({ ...prev, maxPlayers: undefined }));
    }
  }

  function handleMaxPlayersChange(value: string) {
    setMaxPlayers(value);
    setFieldErrors((prev) => ({ ...prev, maxPlayers: undefined }));

    const selected = gameTypes.find((gameType) => String(gameType.id) === gameTypeId);
    const maxLimit = selected?.default_max_players;
    const num = Number(value) || 0;
    if (selected && maxLimit && num > maxLimit) {
      setHints((prev) => ({
        ...prev,
        maxPlayers: `Será limitado a ${maxLimit} jogadores (máx. de ${selected.name})`,
      }));
    } else if (selected && maxLimit) {
      setHints((prev) => ({ ...prev, maxPlayers: `Limite de ${maxLimit} para ${selected.name}` }));
    } else {
      setHints((prev) => ({ ...prev, maxPlayers: undefined }));
    }
  }

  function handleMaxPlayersBlur() {
    const selected = gameTypes.find((gameType) => String(gameType.id) === gameTypeId);
    const maxLimit = selected?.default_max_players;
    const num = Number(maxPlayers) || 0;
    if (selected && maxLimit && num > maxLimit) {
      setMaxPlayers(String(maxLimit));
      setHints((prev) => ({
        ...prev,
        maxPlayers: `Limite de ${maxLimit} para ${selected.name}`,
      }));
    }
  }

  async function handleSubmit() {
    setError(null);

    if (!gameTypeId) {
      setError("Selecione o tipo de jogo");
      return;
    }
    if (!date) {
      setError("Informe a data da partida");
      return;
    }
    if (!timeHour || !timeMinute) {
      setError("Informe o horário da partida");
      return;
    }
    if (!location.trim()) {
      setError("Informe o local da partida");
      return;
    }

    const selectedGameType = gameTypes.find((gameType) => String(gameType.id) === gameTypeId);
    const maxLimit = selectedGameType?.default_max_players ?? Infinity;

    const rawMaxP = Number(maxPlayers) || 0;
    if (rawMaxP < 2) {
      setFieldErrors({ maxPlayers: "O total de jogadores deve ser no mínimo 2" });
      setError(null);
      return;
    }
    const maxP = Math.min(rawMaxP, maxLimit);
    const maxW = Math.max(0, Math.min(50, Number(maxWaitlist) || 0));

    setSubmitting(true);

    try {
      const dateTimeLocal = new Date(`${date}T${timeHour}:${timeMinute}`);
      if (Number.isNaN(dateTimeLocal.getTime())) {
        setError("Data ou hora inválidas");
        return;
      }

      const isPast = dateTimeLocal.getTime() < Date.now();
      if (isPast) {
        setHints((prev) => ({ ...prev, date: "A data e o horário devem ser no futuro" }));
        setError("Não é possível criar uma partida em data ou horário no passado");
        return;
      }
      setHints((prev) => ({ ...prev, date: undefined }));

      const matchPayload = {
        date_time: dateTimeLocal.toISOString(),
        location: location.trim(),
        game_type_id: Number(gameTypeId),
        max_players: maxP,
        max_waitlist: maxW,
        organizer_id: user?.id ?? "",
        status: "open" as const,
        team_a_name: teamAName.trim() || null,
        team_b_name: teamBName.trim() || null,
        group_id: activeGroupId,
      };

      const { error: insertError } = await supabase.from("matches").insert(matchPayload);

      if (insertError) {
        console.error("Erro ao criar partida:", insertError);
        setError(insertError.message);
        return;
      }

      navigate("/");
    } finally {
      setSubmitting(false);
    }
  }

  if (adminLoading) {
    return (
      <AppShell>
        <div className="p-margin-desktop">
          <div className="h-8 w-64 bg-surface-variant animate-pulse rounded mb-8" />
          <div className="h-96 bg-surface-variant animate-pulse rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!isGroupAdmin) {
    return <NewMatchAccessRestricted />;
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 border-b border-outline-variant gap-4">
        <div className="flex items-center gap-3">
          <MaterialIcon name="add_circle" className="w-6 h-6 text-primary" />
          <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase">Novo Jogo</h2>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-margin-desktop pt-8">
        <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant">
          <h3 className="text-headline-md font-display uppercase text-on-surface mb-8">Agendar Partida</h3>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className={labelClass} htmlFor="game-type">
                Tipo de Jogo
              </label>
              <Dropdown
                icon="sports_soccer"
                value={gameTypeId}
                options={gameTypes.map((gameType) => ({
                  value: String(gameType.id),
                  label: gameType.name,
                }))}
                onChange={handleGameTypeChange}
                placeholder="Selecione o tipo de jogo"
              />
            </div>

            <NewMatchScheduleSection
              date={date}
              dateHint={hints.date}
              timeHour={timeHour}
              timeMinute={timeMinute}
              onDateChange={(val) => {
                setDate(val);
                setHints((prev) => ({ ...prev, date: undefined }));
              }}
              onHourChange={setTimeHour}
              onMinuteChange={setTimeMinute}
            />

            <InputField label="Local" icon="location_on" placeholder="Ex.: Arena Futsal Centro" value={location} onChange={setLocation} />

            <NewMatchPlayersConfig
              maxPlayers={maxPlayers}
              maxWaitlist={maxWaitlist}
              fieldError={fieldErrors.maxPlayers}
              hint={hints.maxPlayers}
              onMaxPlayersChange={handleMaxPlayersChange}
              onMaxPlayersBlur={handleMaxPlayersBlur}
              onMaxWaitlistChange={setMaxWaitlist}
            />

            <NewMatchTeamNamesSection teamAName={teamAName} teamBName={teamBName} onTeamAChange={setTeamAName} onTeamBChange={setTeamBName} />

            {error && (
              <div className="flex items-start gap-3 p-4 bg-error-container/20 border border-error/40 rounded-lg">
                <MaterialIcon name="error" className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <p className="font-mono text-label-sm text-on-surface leading-relaxed">{error}</p>
              </div>
            )}

            <Button variant="brand" fullWidth icon={submitting ? "pending" : "add_circle"} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Criando..." : "Criar Partida"}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
