import { supabase } from "./supabaseClient";

export async function validateMatchGroup(
  matchId: string,
  groupId: string | null,
): Promise<{ valid: boolean; error?: string }> {
  if (!groupId) return { valid: true };

  const { data, error } = await supabase
    .from("matches")
    .select("group_id")
    .eq("id", matchId)
    .single();

  if (error) {
    return { valid: false, error: "Partida não encontrada" };
  }

  if (data.group_id !== groupId) {
    return { valid: false, error: "Partida não pertence ao grupo ativo" };
  }

  return { valid: true };
}
