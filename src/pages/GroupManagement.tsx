import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

interface PendingMember {
  user_id: string;
  group_id: string;
  role: string;
  status: string;
  joined_at: string;
  users: { name: string | null; avatar_url: string | null } | null;
}

interface Member {
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  users: { name: string | null; avatar_url: string | null } | null;
}

export default function GroupManagement() {
  const { user } = useAuth();
  const { activeGroup, activeGroupId, isGroupAdmin, refresh: refreshGroup } = useActiveGroup();
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!activeGroupId || !user) {
      setLoading(false);
      return;
    }

    const [pendingRes, membersRes] = await Promise.all([
      supabase
        .from("group_members")
        .select("user_id, group_id, role, status, joined_at, users(name, avatar_url)")
        .eq("group_id", activeGroupId)
        .eq("status", "pending"),
      supabase
        .from("group_members")
        .select("user_id, role, status, joined_at, users(name, avatar_url)")
        .eq("group_id", activeGroupId)
        .eq("status", "approved")
        .order("joined_at", { ascending: true }),
    ]);

    setPending((pendingRes.data ?? []) as PendingMember[]);
    setMembers((membersRes.data ?? []) as Member[]);
    setLoading(false);
  }, [activeGroupId, user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await fetchData();
      if (cancelled) return;
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  async function handleApprove(userId: string) {
    if (!activeGroupId) return;
    setBusyUserId(userId);
    try {
      const payload = { status: "approved" };
      await supabase.from("group_members").update(payload).eq("group_id", activeGroupId).eq("user_id", userId);
      await fetchData();
      refreshGroup();
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleReject(userId: string) {
    if (!activeGroupId) return;
    setBusyUserId(userId);
    try {
      await supabase.from("group_members").delete().eq("group_id", activeGroupId).eq("user_id", userId);
      await fetchData();
      refreshGroup();
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleSetRole(userId: string, role: "admin" | "member") {
    if (!activeGroupId) return;
    setBusyUserId(userId);
    try {
      const payload = { role };
      await supabase.from("group_members").update(payload).eq("group_id", activeGroupId).eq("user_id", userId);
      await fetchData();
      refreshGroup();
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleCopyCode() {
    if (!activeGroup?.code) return;
    await navigator.clipboard.writeText(activeGroup.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (!activeGroup) {
    return null;
  }

  if (!isGroupAdmin) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
          <div className="text-center">
            <MaterialIcon name="lock" className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
            <h2 className="text-headline-md font-display font-black text-on-surface">ACESSO RESTRITO</h2>
            <p className="text-body-md text-on-surface-variant mt-2">Apenas administradores deste grupo podem gerenciá-lo.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter mb-6">GERENCIAR GRUPO</h1>

        <section className="mb-8 p-4 bg-surface-container-high border border-outline-variant rounded-xl">
          <h2 className="text-title-md font-mono text-on-surface mb-3">Código do grupo</h2>
          <p className="text-body-sm text-on-surface-variant mb-3">Compartilhe este código com quem você quer que entre no grupo:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-surface-container font-mono text-headline-sm text-on-surface border border-outline-variant rounded text-center tracking-widest">
              {activeGroup.code}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-2 bg-primary text-on-primary font-mono text-label-sm brutal-shadow hover:scale-105 transition-transform flex items-center gap-2"
            >
              <MaterialIcon name={copied ? "check" : "content_copy"} className="w-4 h-4" />
              {copied ? "COPIADO!" : "COPIAR"}
            </button>
          </div>
          <p className="text-label-sm text-on-surface-variant mt-2">
            Nome: <span className="text-on-surface font-bold">{activeGroup.name}</span>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-title-md font-mono text-on-surface mb-3">Solicitações pendentes ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Nenhuma solicitação no momento.</p>
          ) : (
            <div className="space-y-2">
              {pending.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-3 bg-surface-container-high border border-outline-variant rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-variant rounded-full flex items-center justify-center">
                      <MaterialIcon name="person" className="w-5 h-5 text-on-surface-variant" />
                    </div>
                    <span className="font-mono text-label-sm text-on-surface">{p.users?.name ?? p.user_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyUserId === p.user_id}
                      onClick={() => handleApprove(p.user_id)}
                      className="px-3 py-1 bg-primary-container text-on-primary-container font-mono text-label-sm hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      {busyUserId === p.user_id ? "..." : "ACEITAR"}
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === p.user_id}
                      onClick={() => handleReject(p.user_id)}
                      className="px-3 py-1 bg-error-container text-on-error-container font-mono text-label-sm hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      RECUSAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-title-md font-mono text-on-surface mb-3">Membros ({members.length})</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between p-3 bg-surface-container-high border border-outline-variant rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-surface-variant rounded-full flex items-center justify-center">
                    <MaterialIcon name="person" className="w-5 h-5 text-on-surface-variant" />
                  </div>
                  <span className="font-mono text-label-sm text-on-surface">{m.users?.name ?? m.user_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  {m.role === "admin" ? (
                    <button
                      type="button"
                      disabled={busyUserId === m.user_id}
                      onClick={() => handleSetRole(m.user_id, "member")}
                      className="font-mono text-label-sm px-2 py-0.5 rounded bg-primary-container text-on-primary-container hover:scale-105 transition-transform disabled:opacity-50"
                      title="Rebaixar para membro"
                    >
                      ADMIN
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyUserId === m.user_id}
                      onClick={() => handleSetRole(m.user_id, "admin")}
                      className="font-mono text-label-sm px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant hover:scale-105 transition-transform disabled:opacity-50"
                      title="Promover a admin do grupo"
                    >
                      MEMBRO
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
