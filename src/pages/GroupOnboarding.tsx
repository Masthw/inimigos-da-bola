import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { supabase } from "../lib/supabaseClient";

export default function GroupOnboarding() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { activeGroup, loading: groupLoading } = useActiveGroup();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"join" | "create" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (activeGroup) {
    navigate("/", { replace: true });
    return null;
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !groupName.trim()) return;

    setSubmitting(true);
    setError(null);

    const { data: group, error: insertError } = await supabase
      .from("groups")
      .insert({ name: groupName.trim(), description: groupDescription.trim() || null })
      .select("id")
      .single();

    if (insertError) {
      setError("Erro ao criar grupo. Tente novamente.");
      setSubmitting(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: user.id, role: "admin" });

    if (memberError) {
      setError("Erro ao associar ao grupo. Tente novamente.");
      setSubmitting(false);
      return;
    }

    window.location.reload();
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;

    setSubmitting(true);
    setError(null);

    const { data: group, error: fetchError } = await supabase
      .from("groups")
      .select("id")
      .eq("id", joinCode.trim())
      .maybeSingle();

    if (fetchError || !group) {
      setError("Grupo não encontrado. Verifique o código.");
      setSubmitting(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: user.id, role: "member", status: "pending" });

    if (memberError) {
      setError("Erro ao entrar no grupo. Talvez você já seja membro.");
      setSubmitting(false);
      return;
    }

    setJoined(true);
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="w-full max-w-md text-center">
          <MaterialIcon name="schedule" className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter">
            AGUARDANDO APROVAÇÃO
          </h1>
          <p className="text-body-md text-on-surface-variant mt-2">
            Sua entrada foi solicitada. O administrador do grupo precisa aprovar sua participação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <MaterialIcon name="group_add" className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter">
            GRUPOS
          </h1>
          <p className="text-body-md text-on-surface-variant mt-2">
            Crie um grupo ou entre com um código para começar
          </p>
        </div>

        {!mode && (
          <div className="space-y-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setMode("create")}
                className="w-full py-4 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3"
              >
                <MaterialIcon name="add_circle" className="w-5 h-5" />
                CRIAR GRUPO
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode("join")}
              className="w-full py-4 bg-secondary-container text-on-secondary-container font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3"
            >
              <MaterialIcon name="login" className="w-5 h-5" />
              ENTRAR COM CÓDIGO
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-on-surface-variant font-mono text-label-sm flex items-center gap-1 mb-2"
            >
              <MaterialIcon name="arrow_back" className="w-4 h-4" />
              Voltar
            </button>
            <div>
              <label className="block text-label-sm font-mono text-on-surface-variant mb-1">
                Nome do grupo
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Pelada do Trabalho"
                className="w-full px-4 py-3 bg-surface-container-high border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-label-sm font-mono text-on-surface-variant mb-1">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Ex: Jogo toda quarta às 19h"
                className="w-full px-4 py-3 bg-surface-container-high border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            {error && (
              <p className="text-error font-body text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !groupName.trim()}
              className="w-full py-4 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? (
                <MaterialIcon name="pending" className="w-5 h-5 animate-spin" />
              ) : (
                <MaterialIcon name="check" className="w-5 h-5" />
              )}
              {submitting ? "CRIANDO..." : "CRIAR GRUPO"}
            </button>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-on-surface-variant font-mono text-label-sm flex items-center gap-1 mb-2"
            >
              <MaterialIcon name="arrow_back" className="w-4 h-4" />
              Voltar
            </button>
            <div>
              <label className="block text-label-sm font-mono text-on-surface-variant mb-1">
                Código do grupo
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Cole o código do grupo"
                className="w-full px-4 py-3 bg-surface-container-high border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
                required
              />
            </div>
            {error && (
              <p className="text-error font-body text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !joinCode.trim()}
              className="w-full py-4 bg-secondary-container text-on-secondary-container font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? (
                <MaterialIcon name="pending" className="w-5 h-5 animate-spin" />
              ) : (
                <MaterialIcon name="login" className="w-5 h-5" />
              )}
              {submitting ? "ENTRANDO..." : "ENTRAR NO GRUPO"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
