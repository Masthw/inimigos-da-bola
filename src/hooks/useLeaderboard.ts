import { useEffect, useState } from "react";
import { getFirstName } from "../lib/profile";
import { fetchRankingData } from "../lib/rankings";
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

    let cancelled = false;

    const currentUserId = user.id;

    // Clear stale data immediately when group changes
    setEntries([]);
    setSeasonStarted(false);
    setLoading(true);

    async function load() {
      const data = await fetchRankingData(effectiveGroupId, currentUserId);

      if (cancelled) return;

      setEntries(
        data.entries.map((entry) => ({
          id: entry.id,
          name: getFirstName(entry.name),
          avatarUrl: entry.avatarUrl,
          points: entry.points,
          isCurrentUser: entry.isCurrentUser,
        })),
      );
      setSeasonStarted(data.hasPlayedMatches || data.hasLeaderboardPoints || data.seasonExists);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, effectiveGroupId]);

  return { entries, loading, seasonStarted };
}