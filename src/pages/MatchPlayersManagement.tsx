import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { validateMatchGroup } from "../lib/groupGuard";
import { supabase } from "../lib/supabaseClient";

interface MatchPlayerRow {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  team: string;
  status: string;
  users: { name: string | null; avatar_url: string | null } | null;
}

export default function MatchPlayersManagement() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { activeGroupId } = useActiveGroup();
  const [players, setPlayers] = useState<MatchPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [guestTeam, setGuestTeam] = useState("A");
  const [submitting, setSubmitting] = useState(false);
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

  const fetchPlayers = useCallback(async () => {
    if (!matchId) return;

    const { data } = await supabase
      .from("match_players")
      .select("id, user_id, guest_name, team, status, users(name, avatar_url)")
      .eq("match_id", matchId)
      .eq("status", "confirmed")
      .order("team", { ascending: true });

    setPlayers((data ?? []) as MatchPlayerRow[]);
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlayers();
  }, [fetchPlayers]);

  async function handleRemove(playerId: string) {
    if (!matchId || !activeGroupId) return;
    const { valid, error: guardError } = await validateMatchGroup(matchId, activeGroupId);
    if (!valid) {
      setError(guardError ?? "Acesso negado");
      return;
    }
    await supabase.from("match_players").delete().eq("id", playerId);
    fetchPlayers();
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!matchId || !guestName.trim() || !activeGroupId) return;

    const { valid, error: guardError } = await validateMatchGroup(matchId, activeGroupId);
    if (!valid) {
      setError(guardError ?? "Acesso negado");
      return;
    }

    setSubmitting(true);
    await supabase.from("match_players").insert({
      match_id: matchId,
      guest_name: guestName.trim(),
      team: guestTeam,
      status: "confirmed",
    });
    setGuestName("");
    setSubmitting(false);
    fetchPlayers();
  }

  if (error) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
          <div className="text-center">
            <MaterialIcon name="error" className="w-10 h-10 text-error mx-auto mb-4" />
            <p className="font-mono text-label-bold text-on-surface">{error}</p>
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

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-surface-variant rounded-lg transition-colors"
          >
            <MaterialIcon name="arrow_back" className="w-5 h-5 text-on-surface-variant" />
          </button>
          <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter">
            GERENCIAR JOGADORES
          </h1>
        </div>

        <section className="mb-8">
          <h2 className="text-title-md font-mono text-on-surface mb-3">
            Confirmados ({players.length})
          </h2>
          {players.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Nenhum jogador confirmado.</p>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-surface-container-high border border-outline-variant rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-variant rounded-full flex items-center justify-center">
                      <MaterialIcon name="person" className="w-5 h-5 text-on-surface-variant" />
                    </div>
                    <div>
                      <span className="font-mono text-label-sm text-on-surface">
                        {player.users?.name ?? player.guest_name ?? "Convidado"}
                      </span>
                      <span className={`ml-2 font-mono text-label-sm px-2 py-0.5 rounded ${
                        player.team === "A"
                          ? "bg-error-container text-on-error-container"
                          : "bg-primary-container text-on-primary-container"
                      }`}>
                        Time {player.team}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(player.id)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors"
                    aria-label="Remover jogador"
                  >
                    <MaterialIcon name="remove_circle_outline" className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="p-4 bg-surface-container-high border border-outline-variant rounded-xl">
          <h2 className="text-title-md font-mono text-on-surface mb-3">Adicionar Convidado</h2>
          <form onSubmit={handleAddGuest} className="space-y-3">
            <div>
              <label className="block text-label-sm font-mono text-on-surface-variant mb-1">
                Nome do convidado
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-4 py-3 bg-surface-container border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-label-sm font-mono text-on-surface-variant mb-1">
                Time
              </label>
              <div className="flex gap-2">
                {["A", "B"].map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => setGuestTeam(team)}
                    className={`flex-1 py-3 font-mono text-label-bold border transition-colors ${
                      guestTeam === team
                        ? team === "A"
                          ? "bg-error-container text-on-error-container border-error"
                          : "bg-primary-container text-on-primary-container border-primary"
                        : "bg-surface-container text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    Time {team}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || !guestName.trim()}
              className="w-full py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <MaterialIcon name="pending" className="w-5 h-5 animate-spin" />
              ) : (
                <MaterialIcon name="person_add" className="w-5 h-5" />
              )}
              {submitting ? "ADICIONANDO..." : "ADICIONAR CONVIDADO"}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
