import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { GroupCodeCard } from "../components/groups/GroupCodeCard";
import { PendingRequestsList } from "../components/groups/PendingRequestsList";
import { GroupMembersList } from "../components/groups/GroupMembersList";
import { RemoveMemberModal } from "../components/groups/RemoveMemberModal";
import type { Member, PendingMember } from "../components/groups/types";
import { useActiveGroup } from "../hooks/useActiveGroup";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

export default function GroupManagement() {
  const { user } = useAuth();
  const { activeGroup, activeGroupId, isGroupAdmin, refresh: refreshGroup } = useActiveGroup();
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
