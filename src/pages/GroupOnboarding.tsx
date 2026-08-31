import { useState } from "react";
import { Navigate } from "react-router-dom";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { useAuth } from "../hooks/useAuth";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { supabase } from "../lib/supabaseClient";

export default function GroupOnboarding() {
  const { user } = useAuth();
  const { activeGroup, loading: groupLoading, refresh: refreshGroup } = useActiveGroup();

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
    return <Navigate to="/" replace />;
  }

  async function handleJoinGroup(e: React.SubmitEvent<HTMLFormElement>) {
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

      refreshGroup();
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
          <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter">ENTRAR NO GRUPO</h1>
          <p className="text-body-md text-on-surface-variant mt-2">Insira o código de 6 dígitos para começar</p>
        </div>

        <form onSubmit={handleJoinGroup} className="space-y-4">
          <div>
            <label htmlFor="join-code" className="block text-label-sm font-mono text-on-surface-variant mb-1">
              Código do grupo
            </label>
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
            className="w-full py-4 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {submitting ? <MaterialIcon name="pending" className="w-5 h-5 animate-spin" /> : <MaterialIcon name="login" className="w-5 h-5" />}
            {submitting ? "ENTRANDO..." : "ENTRAR NO GRUPO"}
          </button>
        </form>
      </div>
    </div>
  );
}
