import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export interface GroupInfo {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

const GROUP_STORAGE_KEY = "inimigos-da-bola:active-group-id";

export function useActiveGroup() {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = localStorage.getItem(GROUP_STORAGE_KEY);

      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(name, description, code)")
        .eq("status", "approved")
        .order("joined_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar grupos:", error);
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      const mapped: GroupInfo[] = (data ?? []).map((row) => ({
        id: row.group_id,
        name: row.groups?.name ?? "Grupo",
        code: row.groups?.code ?? "",
        description: row.groups?.description ?? null,
      }));

      if (!cancelled) {
        setGroups(mapped);
        setActiveGroupId(stored ?? mapped[0]?.id ?? null);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveGroup = (groupId: string | null) => {
    setActiveGroupId(groupId);
    if (groupId) {
      localStorage.setItem(GROUP_STORAGE_KEY, groupId);
    } else {
      localStorage.removeItem(GROUP_STORAGE_KEY);
    }
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  return { groups, activeGroup, activeGroupId, setActiveGroup, loading };
}
