import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { GroupCodeCard } from "../components/groups/GroupCodeCard";
import { PendingRequestsList } from "../components/groups/PendingRequestsList";
import { GroupMembersList } from "../components/groups/GroupMembersList";
import { RemoveMemberModal } from "../components/groups/RemoveMemberModal";
import { LeaveGroupModal } from "../components/groups/LeaveGroupModal";
import type { Member, PendingMember } from "../components/groups/types";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

export default function GroupManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeGroup, activeGroupId, isGroupAdmin, refresh: refreshGroup } = useActiveGroup();
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!activeGroupId || !user || !isGroupAdmin) {
      setPending([]);
      setMembers([]);
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
  }, [activeGroupId, user, isGroupAdmin]);

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
    if (!activeGroupId || busyUserId) return;
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
    if (!activeGroupId || busyUserId) return;
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
    if (!activeGroupId || busyUserId) return;
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

  async function handleRemoveMember() {
    if (!activeGroupId || !memberToRemove || isRemoving) return;
    setIsRemoving(true);
    try {
      await supabase
        .from("group_members")
        .delete()
        .eq("group_id", activeGroupId)
        .eq("user_id", memberToRemove.user_id);
      await fetchData();
      refreshGroup();
      setMemberToRemove(null);
    } finally {
      setIsRemoving(false);
    }
  }

  async function handleLeaveGroup() {
    if (!activeGroupId || !user || isLeaving) return;
    setIsLeaving(true);
    setLeaveError(null);
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", activeGroupId)
        .eq("user_id", user.id);
      if (error) throw error;
      setShowLeaveModal(false);
      await refreshGroup();
      navigate("/");
    } catch {
      setLeaveError("Não foi possível sair do grupo. Tente novamente.");
    } finally {
      setIsLeaving(false);
    }
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
        <div className="p-4 max-w-2xl mx-auto">
          <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter mb-6">MEU GRUPO</h1>

          <section className="p-4 bg-surface-container-high border border-outline-variant rounded-xl mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MaterialIcon name="groups" className="w-6 h-6 text-primary shrink-0" />
              <h2 className="text-title-md font-mono text-on-surface truncate">{activeGroup.name}</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Ao sair do grupo, você perde o acesso às partidas, rankings e conquistas dele.
            </p>
          </section>

          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="w-full py-4 bg-error text-on-error font-mono text-label-bold brutal-shadow hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
          >
            <MaterialIcon name="logout" className="w-5 h-5" />
            SAIR DO GRUPO
          </button>
        </div>

        <LeaveGroupModal
          open={showLeaveModal}
          groupName={activeGroup.name}
          isLeaving={isLeaving}
          error={leaveError}
          onConfirm={handleLeaveGroup}
          onClose={() => {
            setShowLeaveModal(false);
            setLeaveError(null);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter mb-6">GERENCIAR GRUPO</h1>

        <GroupCodeCard code={activeGroup.code} groupName={activeGroup.name} />

        <PendingRequestsList
          pending={pending}
          busyUserId={busyUserId}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        <GroupMembersList
          members={members}
          currentUserId={user?.id}
          busyUserId={busyUserId}
          onSetRole={handleSetRole}
          onRemove={(m) => setMemberToRemove(m)}
        />
      </div>

      <RemoveMemberModal
        member={memberToRemove}
        groupName={activeGroup.name}
        isRemoving={isRemoving}
        onConfirm={handleRemoveMember}
        onClose={() => setMemberToRemove(null)}
      />
    </AppShell>
  );
}
