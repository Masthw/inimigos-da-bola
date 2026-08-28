import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { GroupContext, type GroupInfo } from "./GroupContext";

const GROUP_STORAGE_KEY = "inimigos-da-bola:active-group-id";

export function GroupContextProvider() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const stored = localStorage.getItem(GROUP_STORAGE_KEY);

    const [{ data, error }, { data: rpcResult, error: rpcError }] = await Promise.all([
      supabase
        .from("group_members")
        .select("group_id, groups(name, description, code)")
        .eq("status", "approved")
        .order("joined_at", { ascending: true }),
      user ? supabase.rpc("is_admin") : { data: false, error: null },
    ]);

    if (error) {
      console.error("Erro ao buscar grupos:", error);
      setLoading(false);
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

    const mapped: GroupInfo[] = (data ?? []).map((row) => ({
      id: row.group_id,
      name: row.groups?.name ?? "Grupo",
      code: row.groups?.code ?? "",
      description: row.groups?.description ?? null,
    }));

    setGroups(mapped);
    setActiveGroupId(stored ?? mapped[0]?.id ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-role-${user.id}`)
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

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  const contextValue = useMemo(() => ({
    groups,
    activeGroup,
    activeGroupId,
    setActiveGroup,
    loading,
    isAdmin,
    refresh: load,
  }), [groups, activeGroup, activeGroupId, setActiveGroup, loading, isAdmin, load]);

  return (
    <GroupContext.Provider value={contextValue}>
      <Outlet />
    </GroupContext.Provider>
  );
}
