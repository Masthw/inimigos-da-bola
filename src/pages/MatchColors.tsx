import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { Button } from "../components/ui/Button";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { TeamColorPicker } from "../components/match/TeamColorPicker";
import { MatchErrorState } from "../components/match/MatchErrorState";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useAuth } from "../hooks/useAuth";
import { validateMatchGroup } from "../lib/groupGuard";
import { supabase } from "../lib/supabaseClient";

const MIXED_COLOR = "#a855f7";

interface MatchData {
  id: string;
  status: string;
  teamAName: string | null;
  teamBName: string | null;
  teamAColor: string | null;
  teamBColor: string | null;
  organizerId: string;
}

function NonCreatorNotice({ onBack }: Readonly<{ onBack: () => void }>) {
  return (
    <AppShell>
      <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <MaterialIcon name="lock" className="w-10 h-10 text-error mx-auto mb-4" />
          <p className="font-mono text-label-bold text-on-surface uppercase">Somente o criador</p>
          <p className="font-body text-sm text-on-surface-variant mt-2 mb-6">Apenas quem criou a partida pode escolher as cores e iniciar o jogo.</p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 font-mono text-label-sm text-primary hover:bg-surface-variant transition-colors"
          >
            Voltar para partida
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function NotPreparingNotice({ onBack }: Readonly<{ onBack: () => void }>) {
  return (
    <AppShell>
      <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
        <div className="text-center">
          <MaterialIcon name="check_circle" className="w-10 h-10 text-success mx-auto mb-4" />
          <p className="font-mono text-label-bold text-on-surface">Partida não está em preparação</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-4 py-2 font-mono text-label-sm text-primary hover:bg-surface-variant transition-colors"
          >
            Ir para a partida
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function ColorStepSection({
  step,
  teamAName,
  teamBName,
  teamA,
  teamB,
  currentTeam,
  excludeColor,
  excludeMisto,
  onSelectColor,
}: Readonly<{
  step: "a" | "b";
  teamAName: string;
  teamBName: string;
  teamA: string | null;
  teamB: string | null;
  currentTeam: string | null;
  excludeColor: string | null;
  excludeMisto: boolean;
  onSelectColor: (hex: string) => void;
}>) {
  const currentTeamName = step === "a" ? teamAName : teamBName;
  const currentStepColor = step === "a" ? (teamA ?? "#6b7280") : (teamB ?? "#6b7280");
  const stepLabel = step === "a" ? "Etapa 1 de 2" : "Etapa 2 de 2";

  return (
    <div className="bg-surface-container-high rounded-2xl border border-outline-variant p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentStepColor }} />
        <h3 className="font-mono text-label-bold text-on-surface uppercase tracking-widest">{currentTeamName}</h3>
        <span className="ml-auto font-mono text-[10px] text-on-surface-variant uppercase">{stepLabel}</span>
      </div>

      <TeamColorPicker
        label="Escolha a cor do colete"
        selectedColor={currentTeam}
        onSelect={onSelectColor}
        excludeColor={excludeColor}
        excludeMisto={excludeMisto}
      />
    </div>
  );
}

function useMatchColors(matchId: string | undefined, activeGroupId: string | null, userId: string | undefined) {
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [teamA, setTeamA] = useState<string | null>(null);
  const [teamB, setTeamB] = useState<string | null>(null);
  const [step, setStep] = useState<"a" | "b">("a");

  useEffect(() => {
    if (!matchId || !activeGroupId) return;

    validateMatchGroup(matchId, activeGroupId).then(({ valid, error: guardError }) => {
      if (!valid) {
        setError(guardError ?? "Acesso negado");
        setLoading(false);
      }
    });

    supabase
      .from("matches")
      .select("id, status, team_a_name, team_b_name, team_a_color, team_b_color, organizer_id")
      .eq("id", matchId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (loadError || !data) {
          setError("Partida não encontrada");
          setLoading(false);
          return;
        }
        const parsed: MatchData = {
          id: data.id,
          status: data.status,
          teamAName: data.team_a_name,
          teamBName: data.team_b_name,
          teamAColor: data.team_a_color,
          teamBColor: data.team_b_color,
          organizerId: data.organizer_id,
        };
        setMatch(parsed);
        setTeamA(data.team_a_color ?? null);
        setTeamB(data.team_b_color ?? null);
        setLoading(false);
      });
  }, [matchId, activeGroupId]);

  const isCreator = userId === match?.organizerId;
  const currentTeam = step === "a" ? teamA : teamB;
  const otherTeamColor = step === "a" ? teamB : teamA;
  const excludeColor = otherTeamColor && otherTeamColor !== MIXED_COLOR ? otherTeamColor : null;
  const excludeMisto = otherTeamColor === MIXED_COLOR;
  const canContinue = currentTeam !== null;

  function selectColor(hex: string) {
    if (step === "a") {
      setTeamA(hex);
    } else {
      setTeamB(hex);
    }
  }

  async function handlePrimaryAction() {
    if (step === "a") {
      if (teamA !== null) setStep("b");
      return;
    }
    if (!matchId || !match || teamA === null || teamB === null) return;
    if (teamA === MIXED_COLOR && teamB === MIXED_COLOR) return;

    setSaving(true);
    try {
      const updatePayload = {
        team_a_color: teamA,
        team_b_color: teamB,
        status: "in_progress" as const,
      };
      const { error: updateError } = await supabase.from("matches").update(updatePayload).eq("id", matchId);

      if (updateError) {
        console.error("Erro ao salvar cores:", updateError);
        setError("Erro ao salvar cores");
      } else {
        navigate(`/matches/${matchId}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return {
    match,
    loading,
    error,
    saving,
    teamA,
    teamB,
    step,
    setStep,
    isCreator,
    currentTeam,
    excludeColor,
    excludeMisto,
    canContinue,
    selectColor,
    handlePrimaryAction,
  };
}

interface MatchColorsContentProps {
  match: MatchData;
  teamA: string | null;
  teamB: string | null;
  step: "a" | "b";
  saving: boolean;
  error: string | null;
  currentTeam: string | null;
  excludeColor: string | null;
  excludeMisto: boolean;
  canContinue: boolean;
  onSelectColor: (hex: string) => void;
  onPrimaryAction: () => void;
  onBackStep: () => void;
  onBackMatch: () => void;
}

function MatchColorsContent({
  match,
  teamA,
  teamB,
  step,
  saving,
  error,
  currentTeam,
  excludeColor,
  excludeMisto,
  canContinue,
  onSelectColor,
  onPrimaryAction,
  onBackStep,
  onBackMatch,
}: Readonly<MatchColorsContentProps>) {
  const teamAName = match.teamAName ?? "Time A";
  const teamBName = match.teamBName ?? "Time B";
  const teamABg = teamA ?? "#6b7280";
  const teamBBg = teamB ?? "#6b7280";

  let submitLabel = "Iniciar Jogo";
  if (step === "a") {
    submitLabel = "Continuar para Time B";
  } else if (saving) {
    submitLabel = "Iniciando...";
  }

  return (
    <AppShell>
      <div className="min-h-[calc(100svh-4rem)] flex flex-col">
        <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 shrink-0 border-b border-outline-variant gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBackMatch} className="p-2 hover:bg-surface-variant rounded-lg transition-colors" aria-label="Voltar">
              <MaterialIcon name="arrow_back" className="w-5 h-5 text-on-surface-variant" />
            </button>
            <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">Cores dos Times</h2>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 md:px-margin-desktop py-6">
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-center gap-4 mb-8">
              <span
                className="flex items-center justify-center w-10 h-10 rounded-full font-mono text-label-bold shadow-lg text-white"
                style={{ backgroundColor: teamABg }}
              >
                A
              </span>
              <span className="font-mono text-label-sm text-on-surface-variant uppercase">vs</span>
              <span
                className="flex items-center justify-center w-10 h-10 rounded-full font-mono text-label-bold shadow-lg text-white"
                style={{ backgroundColor: teamBBg }}
              >
                B
              </span>
            </div>

            <ColorStepSection
              step={step}
              teamAName={teamAName}
              teamBName={teamBName}
              teamA={teamA}
              teamB={teamB}
              currentTeam={currentTeam}
              excludeColor={excludeColor}
              excludeMisto={excludeMisto}
              onSelectColor={onSelectColor}
            />

            <div className="flex gap-3 mt-6">
              {step === "b" && (
                <Button variant="secondary" onClick={onBackStep} icon="arrow_back" fullWidth>
                  Voltar
                </Button>
              )}
              <Button variant="primary" fullWidth icon="play_arrow" onClick={onPrimaryAction} disabled={!canContinue || saving}>
                {submitLabel}
              </Button>
            </div>

            {error && <p className="mt-4 font-mono text-label-sm text-error text-center">{error}</p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function MatchColors() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { activeGroupId } = useActiveGroup();
  const { user } = useAuth();
  const {
    match,
    loading,
    error,
    saving,
    teamA,
    teamB,
    step,
    setStep,
    isCreator,
    currentTeam,
    excludeColor,
    excludeMisto,
    canContinue,
    selectColor,
    handlePrimaryAction,
  } = useMatchColors(matchId, activeGroupId, user?.id);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (error || !match) {
    return <MatchErrorState message={error || "Erro ao carregar partida"} />;
  }

  if (!isCreator) {
    return <NonCreatorNotice onBack={() => navigate(`/matches/${match.id}`)} />;
  }

  if (match.status !== "preparing") {
    return <NotPreparingNotice onBack={() => navigate(`/matches/${match.id}`)} />;
  }

  return (
    <MatchColorsContent
      match={match}
      teamA={teamA}
      teamB={teamB}
      step={step}
      saving={saving}
      error={error}
      currentTeam={currentTeam}
      excludeColor={excludeColor}
      excludeMisto={excludeMisto}
      canContinue={canContinue}
      onSelectColor={selectColor}
      onPrimaryAction={handlePrimaryAction}
      onBackStep={() => setStep("a")}
      onBackMatch={() => navigate(`/matches/${match.id}`)}
    />
  );
}
