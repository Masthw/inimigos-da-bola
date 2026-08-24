import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";
import type { Database } from "../lib/database.types";
type MatchPlayerInsert =
  Database["public"]["Tables"]["match_players"]["Insert"];

export type PlayerStatus = "confirmed" | "waitlist" | "cancelled";

export interface MatchPlayer {
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  team: string | null;
}

export interface MatchPlayerDetail {
  userId: string;
  name: string;
  team: string;
  goals: number;
  assists: number;
  awards: string[];
}

export interface MatchWithMeta {
  id: string;
  dateTime: string;
  location: string;
  status: "open" | "in_progress" | "finished" | "voting" | "cancelled";
  maxPlayers: number;
  maxWaitlist: number;
  teamAName: string | null;
  teamBName: string | null;
  teamAScore: number | null;
  teamBScore: number | null;
  sportName: string | null;
  gameTypeName: string | null;
  organizerId: string;
  confirmedCount: number;
  waitlistCount: number;
  confirmedPlayers: MatchPlayer[];
  waitlistPlayers: MatchPlayer[];
  teamAPlayers: MatchPlayerDetail[];
  teamBPlayers: MatchPlayerDetail[];
  teamAColor: string | null;
  teamBColor: string | null;
}

export interface MatchGroups {
  featured: MatchWithMeta | null;
  upcoming: MatchWithMeta[];
  finished: MatchWithMeta[];
}

interface MatchRow {
  id: string;
  date_time: string;
  location: string;
  status: MatchWithMeta["status"];
  max_players: number;
  max_waitlist: number;
  team_a_name: string | null;
  team_b_name: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  team_a_color: string | null;
  team_b_color: string | null;
  organizer_id: string;
  game_types:
    | { name: string | null; sports: { name: string | null } | null }
    | null;
}

interface PlayerRow {
  match_id: string;
  status: PlayerStatus;
  user_id: string | null;
  guest_name: string | null;
  team: string | null;
  users: { name: string | null; avatar_url: string | null } | null;
}

function sortByDate(rows: MatchWithMeta[], ascending: boolean) {
  return [...rows].sort((a, b) => {
    const diff = new Date(a.dateTime).getTime() -
      new Date(b.dateTime).getTime();
    return ascending ? diff : -diff;
  });
}

// HELPERS (Para reduzir a Complexidade Cognitiva do fetch principal)

function processMatchPlayers(playersData: PlayerRow[], userId: string | null) {
  const confirmedCounts = new Map<string, number>();
  const waitlistCounts = new Map<string, number>();
  const playersByMatch = new Map<
    string,
    { confirmed: MatchPlayer[]; waitlist: MatchPlayer[] }
  >();
  const myStatusMap: Record<string, PlayerStatus | undefined> = {};

  for (const row of playersData) {
    if (row.status === "confirmed") {
      confirmedCounts.set(
        row.match_id,
        (confirmedCounts.get(row.match_id) ?? 0) + 1,
      );
    } else if (row.status === "waitlist") {
      waitlistCounts.set(
        row.match_id,
        (waitlistCounts.get(row.match_id) ?? 0) + 1,
      );
    }

    if (userId && row.user_id === userId) {
      myStatusMap[row.match_id] = row.status;
    }

    const name = row.users?.name ?? row.guest_name ?? "Convidado";
    const player: MatchPlayer = {
      userId: row.user_id,
      name,
      avatarUrl: row.users?.avatar_url ?? null,
      team: row.team,
    };
    const entry = playersByMatch.get(row.match_id) ??
      { confirmed: [], waitlist: [] };

    if (row.status === "confirmed") {
      entry.confirmed.push(player);
    } else if (row.status === "waitlist") {
      entry.waitlist.push(player);
    }

    playersByMatch.set(row.match_id, entry);
  }

  return { confirmedCounts, waitlistCounts, playersByMatch, myStatusMap };
}

async function fetchFinishedMatchDetails(finishedMatchIds: string[]) {
  const finishedPlayerDetails = new Map<
    string,
    { teamA: MatchPlayerDetail[]; teamB: MatchPlayerDetail[] }
  >();
  if (finishedMatchIds.length === 0) return finishedPlayerDetails;

  const [detailRes, awardsRes] = await Promise.all([
    supabase
      .from("match_players")
      .select(
        "match_id, user_id, guest_name, goals_scored, assists, team, users(name)",
      )
      .in("match_id", finishedMatchIds)
      .eq("status", "confirmed"),
    supabase.from("match_awards").select("match_id, user_id, awards(name)").in(
      "match_id",
      finishedMatchIds,
    ),
  ]);

  const playerAwards = new Map<string, string[]>();
  for (const row of awardsRes.data ?? []) {
    const name = row.awards?.name;
    if (!name || !row.user_id) continue;
    const key = `${row.match_id}:${row.user_id}`;
    const list = playerAwards.get(key) ?? [];
    list.push(name);
    playerAwards.set(key, list);
  }

  for (const row of detailRes.data ?? []) {
    const name = row.users?.name ?? row.guest_name ?? "Convidado";
    const key = row.user_id ? `${row.match_id}:${row.user_id}` : null;
    const awards = key ? (playerAwards.get(key) ?? []) : [];
    const detail: MatchPlayerDetail = {
      userId: row.user_id ?? "",
      name,
      team: row.team ?? "A",
      goals: row.goals_scored ?? 0,
      assists: row.assists ?? 0,
      awards,
    };
    const entry = finishedPlayerDetails.get(row.match_id) ??
      { teamA: [], teamB: [] };
    if (row.team === "B") entry.teamB.push(detail);
    else entry.teamA.push(detail);
    finishedPlayerDetails.set(row.match_id, entry);
  }

  return finishedPlayerDetails;
}

// BUSCA PRINCIPAL

async function fetchMatchesData(userId: string | null) {
  const [matchesResult, playersResult] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, date_time, location, status, max_players, max_waitlist, team_a_name, team_b_name, team_a_score, team_b_score, team_a_color, team_b_color, organizer_id, game_types(name, sports(name))",
      )
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("date_time", { ascending: true }),
    supabase.from("match_players").select(
      "match_id, status, user_id, guest_name, team, users(name, avatar_url)",
    ),
  ]);

  if (matchesResult.error) throw matchesResult.error;

  const { confirmedCounts, waitlistCounts, playersByMatch, myStatusMap } =
    processMatchPlayers((playersResult.data ?? []) as PlayerRow[], userId);

  const finishedMatchIds = (matchesResult.data ?? []).filter((m) =>
    m.status === "finished"
  ).map((m) => m.id);

  const finishedPlayerDetails = await fetchFinishedMatchDetails(
    finishedMatchIds,
  );

  const rows: MatchWithMeta[] = (matchesResult.data ?? ([] as MatchRow[])).map(
    (match) => {
      const players = playersByMatch.get(match.id) ??
        { confirmed: [], waitlist: [] };
      const finishedDetails = finishedPlayerDetails.get(match.id) ??
        { teamA: [], teamB: [] };
      return {
        id: match.id,
        dateTime: match.date_time,
        location: match.location,
        status: match.status,
        maxPlayers: match.max_players,
        maxWaitlist: match.max_waitlist,
        teamAName: match.team_a_name,
        teamBName: match.team_b_name,
        teamAScore: match.team_a_score,
        teamBScore: match.team_b_score,
        teamAColor: match.team_a_color,
        teamBColor: match.team_b_color,
        sportName: match.game_types?.name ?? match.game_types?.sports?.name ??
          null,
        gameTypeName: match.game_types?.name ?? null,
        organizerId: match.organizer_id,
        confirmedCount: confirmedCounts.get(match.id) ?? 0,
        waitlistCount: waitlistCounts.get(match.id) ?? 0,
        confirmedPlayers: players.confirmed,
        waitlistPlayers: players.waitlist,
        teamAPlayers: finishedDetails.teamA,
        teamBPlayers: finishedDetails.teamB,
      };
    },
  );

  return { rows, myStatusMap };
}

const EMPTY_GROUPS: MatchGroups = {
  featured: null,
  upcoming: [],
  finished: [],
};

// HOOK

export function useMatches() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [groups, setGroups] = useState<MatchGroups>(EMPTY_GROUPS);
  const [myStatus, setMyStatus] = useState<
    Record<string, PlayerStatus | undefined>
  >({});
  const [loading, setLoading] = useState(true);
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

  const applyData = useCallback(
    (
      { rows, myStatusMap }: {
        rows: MatchWithMeta[];
        myStatusMap: Record<string, PlayerStatus | undefined>;
      },
    ) => {
      const now = Date.now();
      const openMatches = rows.filter((match) => match.status === "open");
      const inProgressOrVoting = rows.filter((match) =>
        match.status === "in_progress" || match.status === "voting"
      );

      let featured: MatchWithMeta | null = null;
      if (inProgressOrVoting.length > 0) {
        featured = inProgressOrVoting[0];
      } else {
        featured = openMatches.find((match) =>
          new Date(match.dateTime).getTime() >= now
        ) ?? null;
      }

      const upcoming = sortByDate(
        openMatches.filter((match) =>
          match.id !== featured?.id && new Date(match.dateTime).getTime() >= now
        ),
        true,
      );

      const finished = sortByDate(
        rows.filter((match) => match.status === "finished"),
        false,
      );

      setGroups({ featured, upcoming, finished });
      setMyStatus(myStatusMap);
      setLoading(false);
    },
    [],
  );

  const refetch = useCallback(() => {
    fetchMatchesData(userId)
      .then(applyData)
      .catch((error) => {
        console.error("Erro ao buscar partidas:", error);
      });
  }, [userId, applyData]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          refetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_players",
        },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const setAttendance = useCallback(
    async (matchId: string, status: PlayerStatus) => {
      if (!userId) return;

      setBusyMatchId(matchId);

      const { data: existing } = await supabase.from("match_players").select(
        "id",
      ).eq("match_id", matchId).eq("user_id", userId).maybeSingle();

      const insertPayload: MatchPlayerInsert = {
        match_id: matchId,
        user_id: userId,
        status: status,
        team: "A",
      };

      const result = existing
        ? await supabase.from("match_players").update({ status }).eq(
          "id",
          existing.id,
        )
        : await supabase.from("match_players").insert(insertPayload);

      setBusyMatchId(null);

      if (result.error) {
        console.error("Erro ao atualizar presença:", result.error);
        return;
      }

      refetch();
    },
    [userId, refetch],
  );

  const cancelMatch = useCallback(
    async (matchId: string) => {
      if (!userId) return;

      setBusyMatchId(matchId);

      const { error } = await supabase
        .from("matches")
        .update({
          status: "cancelled",
        })
        .eq("id", matchId);

      setBusyMatchId(null);

      if (error) {
        console.error("Erro ao cancelar partida:", error);
        return;
      }

      refetch();
    },
    [userId, refetch],
  );

  return {
    ...groups,
    loading,
    busyMatchId,
    myStatus,
    setAttendance,
    cancelMatch,
    refetch,
  };
}
