import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getFirstName } from "../lib/profile";
import { useAuth } from "./useAuth";
import { useActiveGroup } from "./useActiveGroup";

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  isCurrentUser: boolean;
}

export function useLeaderboard(groupId: string | null = null) {
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonStarted, setSeasonStarted] = useState(false);

  const effectiveGroupId = groupId ?? activeGroup?.id ?? null;

  useEffect(() => {
    if (!user || !effectiveGroupId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries([]);
      setSeasonStarted(false);
      setLoading(false);
      return;
    }
    const currentUserId = user.id;
    const groupIdString: string = effectiveGroupId;

    let cancelled = false;

    // Clear stale data immediately when group changes
    setEntries([]);
    setSeasonStarted(false);
    setLoading(true);

    async function load() {
      const { data: season } = await supabase
        .from("group_seasons")
        .select("id")
        .eq("group_id", groupIdString)
        .lte("start_date", new Date().toISOString())
        .gte("end_date", new Date().toISOString())
        .maybeSingle();

      if (cancelled) return;

      if (!season) {
        setEntries([]);
        setSeasonStarted(false);
        setLoading(false);
        return;
      }

      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupIdString)
        .eq("status", "approved");

      if (cancelled) return;

      const memberIds = (members ?? []).map((m) => m.user_id);

      if (memberIds.length === 0) {
        setEntries([]);
        setSeasonStarted(true);
        setLoading(false);
        return;
      }

      const { data: leaderboard } = await supabase
        .from("season_leaderboards")
        .select("user_id, points")
        .eq("season_id", season.id)
        .in("user_id", memberIds);

      if (cancelled) return;

      const userIds = (leaderboard ?? []).map((entry) => entry.user_id);

      const { data: users } = userIds.length > 0
        ? await supabase
          .from("users")
          .select("id, name, avatar_url")
          .in("id", userIds)
          .is("deleted_at", null)
          .order("name", { ascending: true })
        : {
          data: [] as {
            id: string;
            name: string | null;
            avatar_url: string | null;
          }[],
        };

      if (cancelled) return;

      const pointsMap = new Map(
        (leaderboard ?? []).map((entry) => [entry.user_id, entry.points ?? 0]),
      );

      setEntries(
        (users ?? []).map((row) => ({
          id: row.id,
          name: getFirstName(row.name ?? "Jogador"),
          avatarUrl: row.avatar_url,
          points: pointsMap.get(row.id) ?? 0,
          isCurrentUser: row.id === currentUserId,
        })),
      );
      setSeasonStarted(true);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, effectiveGroupId]);

  return { entries, loading, seasonStarted };
}
