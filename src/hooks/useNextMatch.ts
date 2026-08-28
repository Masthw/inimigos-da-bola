import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

export interface NextMatchData {
  id: string;
  title: string;
  date: string;
  time: string;
  hour: number;
  location: string;
  sportName: string | null;
  myStatus: "confirmed" | "waitlist" | "cancelled" | null;
  groupId: string | null;
}

const PT_BR = "pt-BR";

const dateFormatter = new Intl.DateTimeFormat(PT_BR, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat(PT_BR, {
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(iso: string): string {
  const formatted = dateFormatter.format(new Date(iso));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

interface MatchRow {
  id: string;
  date_time: string;
  location: string;
  team_a_name: string | null;
  team_b_name: string | null;
  group_id: string | null;
  game_types: { name: string | null; sport_id: number | null; sports: { name: string | null } | null } | null;
}

async function fetchNextMatch(userId: string | null, groupId: string | null): Promise<NextMatchData | null> {
  const now = new Date().toISOString();

  const baseQuery = supabase
    .from("matches")
    .select("id, date_time, location, team_a_name, team_b_name, group_id, game_types(name, sport_id, sports(name))")
    .eq("status", "open")
    .gte("date_time", now)
    .order("date_time", { ascending: true })
    .limit(1);

  const { data, error } = await (groupId
    ? baseQuery.eq("group_id", groupId).maybeSingle()
    : baseQuery.maybeSingle());

  if (error) throw error;
  if (!data) return null;

  const row = data as MatchRow;
  const sportName = row.game_types?.name ?? row.game_types?.sports?.name ?? null;

  let myStatus: NextMatchData["myStatus"] = null;
  if (userId) {
    const { data: playerRow } = await supabase
      .from("match_players")
      .select("status")
      .eq("match_id", row.id)
      .eq("user_id", userId)
      .maybeSingle();

    myStatus = (playerRow?.status ?? null) as NextMatchData["myStatus"];
  }

  return {
    id: row.id,
    title: `${row.team_a_name ?? "Time A"} vs ${row.team_b_name ?? "Time B"}`,
    date: formatDate(row.date_time),
    time: formatTime(row.date_time),
    hour: new Date(row.date_time).getHours(),
    location: row.location,
    sportName,
    myStatus,
    groupId: row.group_id,
  };
}

export function useNextMatch(groupId: string | null = null) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [match, setMatch] = useState<NextMatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setMatch(null);
    setLoading(true);
    setError(null);

    fetchNextMatch(userId, groupId)
      .then((data) => {
        if (cancelled) return;
        setMatch(data);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Erro ao buscar próxima partida:", error);
        setError("Erro ao carregar próxima partida");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, groupId]);

  useEffect(() => {
    let cancelled = false;

    const refetch = async () => {
      try {
        const data = await fetchNextMatch(userId, groupId);
        if (cancelled) return;
        setMatch(data);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao atualizar próxima partida:", error);
      }
    };

    const channel = supabase
      .channel("next-match-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_players" }, refetch)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, groupId]);

  return { match, loading, error };
}
