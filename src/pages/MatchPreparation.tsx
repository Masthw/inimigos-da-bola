import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useAuth } from "../hooks/useAuth";
import { validateMatchGroup } from "../lib/groupGuard";
import { supabase } from "../lib/supabaseClient";

interface MatchPrepData {
  id: string;
  status: string;
  teamAName: string | null;
  teamBName: string | null;
  date: string;
  organizerId: string;
}

interface Action {
  to: string;
  icon: string;
  title: string;
  description: string;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} às ${time}`;
}

export default function MatchPreparation() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { activeGroupId } = useActiveGroup();
  const { user } = useAuth();

  const [match, setMatch] = useState<MatchPrepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      .select("id, status, team_a_name, team_b_name, date_time, organizer_id")
      .eq("id", matchId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (loadError || !data) {
          setError("Partida não encontrada");
          setLoading(false);
          return;
        }
        setMatch({
          id: data.id,
          status: data.status,
          teamAName: data.team_a_name,
          teamBName: data.team_b_name,
          date: data.date_time,
          organizerId: data.organizer_id,
        });
        setLoading(false);
      });
  }, [matchId, activeGroupId]);

  const isCreator = user?.id === match?.organizerId;

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
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
          <div className="text-center">
            <MaterialIcon name="error" className="w-10 h-10 text-error mx-auto mb-4" />
            <p className="font-mono text-label-bold text-on-surface">{error || "Erro ao carregar partida"}</p>
            <button
              type="button"
              onClick={() => navigate("/matches")}
              className="mt-4 px-4 py-2 font-mono text-label-sm text-primary hover:bg-surface-variant transition-colors"
            >
              Voltar para partidas
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (match.status !== "open" && match.status !== "preparing") {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
          <div className="text-center">
            <MaterialIcon name="check_circle" className="w-10 h-10 text-secondary mx-auto mb-4" />
            <p className="font-mono text-label-bold text-on-surface uppercase">Partida não está em preparação</p>
            <Link
              to={`/matches/${match.id}`}
              className="mt-4 px-4 py-2 font-mono text-label-sm text-primary hover:bg-surface-variant transition-colors inline-block"
            >
              Ir para a partida
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const actions: Action[] = [
    {
      to: `/matches/${match.id}/players`,
      icon: "group",
      title: isCreator ? "Gerenciar Jogadores" : "Ver Jogadores",
      description: "Confirme presenças, adicione convidados e organize os times.",
    },
    {
      to: `/matches/${match.id}/tactics`,
      icon: "sports_soccer",
      title: "Definir Escalação",
      description: "Posicione os jogadores na quadra e defina a formação tática.",
    },
    {
      to: `/matches/${match.id}/colors`,
      icon: "palette",
      title: "Escolher Cores",
      description: "Selecione as cores dos coletes de cada time e inicie o jogo ao vivo.",
    },
  ];

  return (
    <AppShell>
      <div className="min-h-[calc(100svh-4rem)] flex flex-col">
        <header className="flex items-center justify-between px-4 md:px-margin-desktop w-full h-16 shrink-0 border-b border-outline-variant gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/matches")}
              className="p-2 hover:bg-surface-variant rounded-lg transition-colors shrink-0"
              aria-label="Voltar"
            >
              <MaterialIcon name="arrow_back" className="w-5 h-5 text-on-surface-variant" />
            </button>
            <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase truncate">
              Preparação
            </h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-margin-desktop py-6">
          <div className="max-w-lg mx-auto space-y-6">
            <div>
              <h1 className="text-headline-lg font-display font-black text-on-surface uppercase">
                {match.teamAName ?? "Time A"} vs {match.teamBName ?? "Time B"}
              </h1>
              <p className="font-body text-on-surface-variant mt-2">{formatDate(match.date)}</p>
            </div>

            <div className="grid gap-3">
              {actions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-start gap-4 p-4 bg-surface-container-high rounded-xl border border-outline-variant hover:border-primary/50 transition-colors"
                >
                  <div className="w-11 h-11 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                    <MaterialIcon name={action.icon} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-label-bold text-on-surface uppercase">{action.title}</p>
                    <p className="font-body text-label-sm text-on-surface-variant mt-1">{action.description}</p>
                  </div>
                  <MaterialIcon name="chevron_right" className="w-5 h-5 text-on-surface-variant shrink-0 ml-auto" />
                </Link>
              ))}
            </div>

            {!isCreator && (
              <p className="font-mono text-label-sm text-on-surface-variant text-center">
                Apenas o criador da partida pode iniciar o jogo ao vivo.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}