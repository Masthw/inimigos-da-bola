import { useState } from "react";
import { Navigate } from "react-router-dom";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { useAuth } from "../hooks/useAuth";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { supabase } from "../lib/supabaseClient";

export default function GroupOnboarding() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { activeGroup, loading: groupLoading } = useActiveGroup();

  const [mode, setMode] = useState<"join" | "create" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [navigateTo, setNavigateTo] = useState<string | null>(null);

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (activeGroup) {
    return <Navigate to="/" replace />;
  }

  if (navigateTo) return <Navigate to={navigateTo} replace />;

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !groupName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      let code: string;
      let attempts = 0;
      do {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        code = (array[0] % 1000000).toString().padStart(6, "0");
        const { data: existing } = await supabase.from("groups").select("code").eq("code", code).maybeSingle();
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      const { data: group, error: insertError } = await supabase
        .from("groups")
        .insert({ name: groupName.trim(), description: groupDescription.trim() || null, code })
        .select("id")
        .single();

      if (insertError) {
        setError("Erro ao criar grupo. Tente novamente.");
        return;
      }

      const { error: memberError } = await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "admin" });

      if (memberError) {
        setError("Erro ao associar ao grupo. Tente novamente.");
        return;
      }

      setNavigateTo("/");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc("join_group_by_code", {
        p_code: joinCode.trim(),
      });

      if (rpcError) {
        setError("Erro ao entrar no grupo. Verifique o código ou tente novamente.");
        return;
      }

      setJoined(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="w-full max-w-md text-center">
          <MaterialIcon name="schedule" className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter">AGUARDANDO APROVAÇÃO</h1>
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
          <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter">GRUPOS</h1>
          <p className="text-body-md text-on-surface-variant mt-2">Crie um grupo ou entre com um código para começar</p>
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
              <label htmlFor="group-name" className="block text-label-sm font-mono text-on-surface-variant mb-1">Nome do grupo</label>
              <input
                id="group-name"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Pelada do Trabalho"
                className="w-full px-4 py-3 bg-surface-container-high border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="group-description" className="block text-label-sm font-mono text-on-surface-variant mb-1">Descrição (opcional)</label>
              <input
                id="group-description"
                type="text"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Ex: Jogo toda quarta às 19h"
                className="w-full px-4 py-3 bg-surface-container-high border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            {error && <p className="text-error font-body text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !groupName.trim()}
              className="w-full py-4 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <MaterialIcon name="pending" className="w-5 h-5 animate-spin" /> : <MaterialIcon name="check" className="w-5 h-5" />}
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
              <label htmlFor="join-code" className="block text-label-sm font-mono text-on-surface-variant mb-1">Código do grupo (6 dígitos)</label>
              <input
                id="join-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full px-4 py-3 bg-surface-container-high border border-outline-variant font-body text-on-surface focus:border-primary focus:outline-none tracking-widest text-center text-headline-sm"
                required
              />
            </div>
            {error && <p className="text-error font-body text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !joinCode.trim()}
              className="w-full py-4 bg-secondary-container text-on-secondary-container font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <MaterialIcon name="pending" className="w-5 h-5 animate-spin" /> : <MaterialIcon name="login" className="w-5 h-5" />}
              {submitting ? "ENTRANDO..." : "ENTRAR NO GRUPO"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
