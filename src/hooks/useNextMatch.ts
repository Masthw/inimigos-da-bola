import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export interface NextMatchData {
  id: string;
  title: string;
  date: string;
  time: string;
  hour: number;
  location: string;
  sportName: string | null;
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

async function fetchNextMatch() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("matches")
    .select("id, date_time, location, team_a_name, team_b_name, game_types(name, sport_id, sports(name))")
    .eq("status", "open")
    .gte("date_time", now)
    .order("date_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function toNextMatchData(data: NonNullable<Awaited<ReturnType<typeof fetchNextMatch>>>): NextMatchData {
  const sportName = data.game_types?.name ?? data.game_types?.sports?.name ?? null;
  const title = `${data.team_a_name ?? "Time A"} vs ${data.team_b_name ?? "Time B"}`;

  return {
    id: data.id,
    title,
    date: formatDate(data.date_time),
    time: formatTime(data.date_time),
    hour: new Date(data.date_time).getHours(),
    location: data.location,
    sportName,
  };
}

export function useNextMatch() {
  const [match, setMatch] = useState<NextMatchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchNextMatch()
      .then((data) => {
        if (cancelled) return;
        setMatch(data ? toNextMatchData(data) : null);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Erro ao buscar próxima partida:", error);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refetch = () => {
      fetchNextMatch()
        .then((data) => {
          if (cancelled) return;
          setMatch(data ? toNextMatchData(data) : null);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Erro ao buscar próxima partida:", error);
        });
    };

    const channel = supabase
      .channel("next-match-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, refetch)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { match, loading };
}
