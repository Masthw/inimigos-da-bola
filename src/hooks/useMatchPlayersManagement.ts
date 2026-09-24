import { useCallback, useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import { validateMatchGroup } from "../lib/groupGuard";
import { supabase } from "../lib/supabaseClient";
import { performClientSideDraw } from "../lib/teamDrawer";
import { useAuth } from "./useAuth";

export interface MatchPlayerRow {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  team: string;
  is_sub: boolean;
  status: string;
  users: { name: string | null; avatar_url: string | null } | null;
}

export interface MatchRow {
  organizer_id: string | null;
  team_a_name: string | null;
  team_b_name: string | null;
  max_players: number;
  status: string;
}

export interface GroupMemberRow {
  user_id: string | null;
  users: { id: string; name: string | null; avatar_url: string | null } | null;
}

interface MatchData {
  players: MatchPlayerRow[];
  waitlist: MatchPlayerRow[];
  groupMembers: GroupMemberRow[];
  match: MatchRow | null;
  loading: boolean;
  error: string | null;
  setPageError: (message: string | null) => void;
  refresh: () => Promise<void>;
  isPreparing: boolean;
  canManage: boolean;
  isFull: boolean;
  capacityInput: string;
  setCapacityInput: (value: string) => void;
}

interface UiApi {
  data: MatchData;
  notify: (message: string | null) => void;
  setPageError: (message: string | null) => void;
}

function useMatchData(
  matchId: string | undefined,
  groupId: string | null,
  userId: string | null,
) {
  const [players, setPlayers] = useState<MatchPlayerRow[]>([]);
  const [waitlist, setWaitlist] = useState<MatchPlayerRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMemberRow[]>([]);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capacityInput, setCapacityInput] = useState("");

  useEffect(() => {
    if (!matchId || !groupId) return;

    validateMatchGroup(matchId, groupId).then(({ valid, error: guardError }) => {
      if (!valid) {
        setError(guardError ?? "Acesso negado");
        setLoading(false);
      }
    });
  }, [matchId, groupId]);

  const fetchAll = useCallback(async () => {
    if (!matchId) return;

    const [matchRes, playersRes, membersRes] = await Promise.all([
      supabase.from("matches").select("organizer_id, team_a_name, team_b_name, max_players, status").eq("id", matchId).maybeSingle(),
      supabase
        .from("match_players")
        .select("id, user_id, guest_name, team, is_sub, status, users(name, avatar_url)")
        .eq("match_id", matchId)
        .in("status", ["confirmed", "waitlist"])
        .order("team", { ascending: true }),
      groupId
        ? supabase
            .from("group_members")
            .select("user_id, users(id, name, avatar_url)")
            .eq("group_id", groupId)
            .eq("status", "approved")
        : Promise.resolve({ data: null }),
    ]);

    if (matchRes.data) {
      setMatch(matchRes.data as MatchRow);
      setCapacityInput(String(matchRes.data.max_players));
    }
    const allPlayers = (playersRes.data ?? []) as MatchPlayerRow[];
    setPlayers(allPlayers.filter((p) => p.status === "confirmed"));
    setWaitlist(allPlayers.filter((p) => p.status === "waitlist"));
    setGroupMembers((membersRes.data ?? []) as GroupMemberRow[]);
    setLoading(false);
  }, [matchId, groupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const canManage = userId != null && userId === match?.organizer_id;
  const isPreparing = match?.status === "preparing";
  const isFull = match ? players.length >= match.max_players : false;

  return {
    players,
    waitlist,
    groupMembers,
    match,
    loading,
    error,
    setPageError: setError,
    refresh: fetchAll,
    isPreparing,
    canManage,
    isFull,
    capacityInput,
    setCapacityInput,
  };
}

function useGuestForm(matchId: string | undefined, groupId: string | null, api: UiApi) {
  const [guestName, setGuestName] = useState("");
  const [guestTeam, setGuestTeam] = useState("A");
  const [submitting, setSubmitting] = useState(false);

  async function handleAddGuest(e: SyntheticEvent) {
    e.preventDefault();
    if (!matchId || !guestName.trim() || !groupId) return;

    if (api.data.match && api.data.players.length >= api.data.match.max_players) {
      api.notify(
        `Partida cheia (${api.data.players.length}/${api.data.match.max_players}). Não é possível adicionar mais convidados.`,
      );
      return;
    }

    const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
    if (!valid) {
      api.setPageError(guardError ?? "Acesso negado");
      return;
    }

    setSubmitting(true);
    api.notify(null);
    try {
      const guestPayload = {
        match_id: matchId,
        guest_name: guestName.trim(),
        team: guestTeam,
        is_sub: false,
        status: "confirmed" as const,
      };
      const { error: insertError } = await supabase.from("match_players").insert(guestPayload);
      if (insertError) {
        api.notify("Erro ao adicionar convidado.");
      } else {
        setGuestName("");
      }
    } finally {
      setSubmitting(false);
    }
    api.data.refresh();
  }

  return {
    guestName,
    setGuestName,
    guestTeam,
    setGuestTeam,
    submitting,
    handleAddGuest,
  };
}

function useCapacityForm(matchId: string | undefined, api: UiApi) {
  const [capacityBusy, setCapacityBusy] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  async function handleUpdateCapacity(e: SyntheticEvent) {
    e.preventDefault();
    if (!matchId || !api.data.canManage) return;

    const num = Number(api.data.capacityInput);
    if (!Number.isInteger(num) || num < api.data.players.length) {
      setCapacityError(
        `A capacidade deve ser um número inteiro maior ou igual ao nº de confirmados (${api.data.players.length}).`,
      );
      return;
    }
    if (num > 99) {
      setCapacityError("A capacidade máxima é 99 jogadores.");
      return;
    }

    setCapacityBusy(true);
    setCapacityError(null);
    api.notify(null);

    const { data, error } = await supabase.rpc("update_match_capacity", {
      p_match_id: matchId,
      p_max_players: num,
    });
    const result = data as { ok?: boolean; reason?: string; promotedCount?: number } | null;

    if (error || !result?.ok) {
      setCapacityError(
        result?.reason === "capacidade menor que confirmados"
          ? `Não é possível reduzir abaixo dos ${api.data.players.length} confirmados.`
          : result?.reason === "sem permissao"
            ? "Apenas o criador (ou administradores) pode alterar a capacidade."
            : error?.message ?? "Não foi possível atualizar a capacidade.",
      );
    } else {
      const promotedCount = Number(result.promotedCount ?? 0);
      api.notify(
        promotedCount > 0
          ? `Capacidade atualizada para ${num}. ${promotedCount} jogador(es) da espera entraram automaticamente.`
          : `Capacidade atualizada para ${num}.`,
      );
    }

    setCapacityBusy(false);
    api.data.refresh();
  }

  return {
    capacityInput: api.data.capacityInput,
    setCapacityInput: api.data.setCapacityInput,
    capacityBusy,
    capacityError,
    handleUpdateCapacity,
  };
}

function useMemberForm(matchId: string | undefined, api: UiApi) {
  const [memberUserId, setMemberUserId] = useState("");
  const [memberBusy, setMemberBusy] = useState(false);

  async function handleAddMember(e: SyntheticEvent) {
    e.preventDefault();
    if (!matchId || !memberUserId) return;

    const member = api.data.groupMembers.find((m) => m.user_id === memberUserId);
    if (!member) return;
    const full = api.data.match
      ? api.data.players.length >= api.data.match.max_players
      : false;

    setMemberBusy(true);
    api.notify(null);

    const memberPayload = {
      match_id: matchId,
      user_id: memberUserId,
      team: "A",
      is_sub: false,
      status: (full ? "waitlist" : "confirmed") as "confirmed" | "waitlist",
    };
    const { error: insertError } = await supabase.from("match_players").insert(memberPayload);

    if (insertError) {
      api.notify("Erro ao adicionar membro.");
    } else {
      setMemberUserId("");
      const name = member.users?.name ?? "Membro";
      api.notify(full ? `${name} adicionado à lista de espera.` : `${name} confirmado na partida.`);
    }

    setMemberBusy(false);
    api.data.refresh();
  }

  return {
    memberUserId,
    setMemberUserId,
    memberBusy,
    handleAddMember,
  };
}

function usePlayerRowActions(
  matchId: string | undefined,
  groupId: string | null,
  api: UiApi,
) {
  async function handleRemove(playerId: string) {
    if (!matchId || !groupId) return;
    const { valid, error: guardError } = await validateMatchGroup(matchId, groupId);
    if (!valid) {
      api.setPageError(guardError ?? "Acesso negado");
      return;
    }
    await supabase.from("match_players").delete().eq("id", playerId);
    await supabase.rpc("promote_waitlist_player", { p_match_id: matchId });
    api.data.refresh();
  }

  async function handleAssignTeam(playerId: string, team: string) {
    if (!api.data.canManage || !api.data.isPreparing) return;
    await supabase.from("match_players").update({ team }).eq("id", playerId);
    api.data.refresh();
  }

  return { handleRemove, handleAssignTeam };
}

function useLineupDraw(matchId: string | undefined, groupId: string | null, api: UiApi) {
  const [redrawing, setRedrawing] = useState(false);

  async function handleRedraw() {
    if (!matchId || !groupId || !api.data.canManage || !api.data.isPreparing) return;
    setRedrawing(true);
    api.notify(null);
    try {
      const res = await supabase.functions.invoke("generate-lineup", { body: { matchId, groupId } });
      if (res.error) throw res.error;
      api.notify("Times sorteados novamente.");
    } catch (drawErr) {
      console.warn("Aviso: sorteio via edge function falhou, executando sorteio direto:", drawErr);
      const { success, error: drawError } = await performClientSideDraw(matchId);
      if (success) {
        api.notify("Times sorteados novamente.");
      } else {
        api.notify(drawError ?? "Erro ao sortear times.");
      }
    } finally {
      setRedrawing(false);
      api.data.refresh();
    }
  }

  return { redrawing, handleRedraw };
}

function useSwapSelection(api: UiApi) {
  const [swapSelected, setSwapSelected] = useState<string[]>([]);

  function handleSwapSelect(playerId: string) {
    setSwapSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 2) return prev;
      return [...prev, playerId];
    });
  }

  async function handleSwap() {
    if (!api.data.canManage || !api.data.isPreparing || swapSelected.length !== 2) return;
    const [a, b] = swapSelected;
    const pa = api.data.players.find((p) => p.id === a);
    const pb = api.data.players.find((p) => p.id === b);
    if (!pa || !pb || pa.team === pb.team) {
      api.notify("Selecione dois jogadores de times diferentes para trocar.");
      setSwapSelected([]);
      return;
    }
    await Promise.all([
      supabase.from("match_players").update({ team: pb.team }).eq("id", pa.id),
      supabase.from("match_players").update({ team: pa.team }).eq("id", pb.id),
    ]);
    setSwapSelected([]);
    api.data.refresh();
  }

  return { swapSelected, handleSwapSelect, handleSwap };
}

export function useMatchPlayersManagement(matchId: string | undefined, groupId: string | null) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const data = useMatchData(matchId, groupId, userId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const notify = useCallback((message: string | null) => setFeedback(message), []);
  const api: UiApi = { data, notify, setPageError: data.setPageError };

  const guest = useGuestForm(matchId, groupId, api);
  const capacity = useCapacityForm(matchId, api);
  const member = useMemberForm(matchId, api);
  const playerActions = usePlayerRowActions(matchId, groupId, api);
  const lineup = useLineupDraw(matchId, groupId, api);
  const swap = useSwapSelection(api);

  return {
    ...data,
    feedback,
    guest,
    capacity,
    member,
    playerActions,
    lineup,
    swap,
  };
}