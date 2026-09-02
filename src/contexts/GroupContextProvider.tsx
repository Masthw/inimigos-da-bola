import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { supabase, uniqueChannelTopic } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { GroupContext, type GroupInfo } from "./GroupContext";

const GROUP_STORAGE_KEY = "inimigos-da-bola:active-group-id";

type RawRow = {
  group_id: string;
  role: string | null;
  groups: { name: string; description: string | null; code: string } | null;
};

function resolveRole(row: RawRow | undefined): "admin" | "member" | null {
  if (!row) return null;
  return row.role === "admin" ? "admin" : "member";
}

export function GroupContextProvider() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [groupsData, setGroupsData] = useState<RawRow[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(GROUP_STORAGE_KEY);

      const [{ data, error }, { data: rpcResult, error: rpcError }] = await Promise.all([
        supabase
          .from("group_members")
          .select("group_id, role, groups(name, description, code)")
          .eq("status", "approved")
          .eq("user_id", user?.id ?? "")
          .order("joined_at", { ascending: true }),
        user ? supabase.rpc("is_admin") : { data: false, error: null },
      ]);

      if (error) {
        console.error("Erro ao buscar grupos:", error);
        return;
      }

      if (!rpcError && typeof rpcResult === "boolean") {
        setIsAdmin(rpcResult);
      } else if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setIsAdmin(userData?.role === "admin");
      }

      const rows = (data ?? []) as RawRow[];
      const mapped: GroupInfo[] = rows.map((row) => ({
        id: row.group_id,
        name: row.groups?.name ?? "Grupo",
        code: row.groups?.code ?? "",
        description: row.groups?.description ?? null,
      }));

      setGroups(mapped);
      setGroupsData(rows);

      const nextActiveId = stored && mapped.some((g) => g.id === stored)
        ? stored
        : mapped[0]?.id ?? null;
      setActiveGroupId(nextActiveId);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(uniqueChannelTopic(`user-role-${user.id}`))
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "users",
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        const newRole = (payload.new as { role?: string })?.role;
        if (newRole) {
          setIsAdmin(newRole === "admin");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const setActiveGroup = useCallback((groupId: string | null) => {
    setActiveGroupId(groupId);
    if (groupId) {
      localStorage.setItem(GROUP_STORAGE_KEY, groupId);
    } else {
      localStorage.removeItem(GROUP_STORAGE_KEY);
    }
  }, []);

  const activeGroup = useMemo<GroupInfo | null>(
    () => groups.find((g) => g.id === activeGroupId) ?? null,
    [groups, activeGroupId],
  );

  const groupRole = useMemo<"admin" | "member" | null>(
    () => resolveRole(groupsData.find((r) => r.group_id === activeGroupId)),
    [groupsData, activeGroupId],
  );
  const isGroupAdmin = groupRole === "admin";

  const contextValue = useMemo(() => ({
    groups,
    activeGroup,
    activeGroupId,
    setActiveGroup,
    loading,
    isAdmin,
    isGroupAdmin,
    groupRole,
    refresh: load,
  }), [groups, activeGroup, activeGroupId, setActiveGroup, loading, isAdmin, isGroupAdmin, groupRole, load]);

  return (
    <GroupContext.Provider value={contextValue}>
      <Outlet />
    </GroupContext.Provider>
  );
}
