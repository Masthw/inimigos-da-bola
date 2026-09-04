import { supabase } from "./supabaseClient";

export async function performClientSideDraw(matchId: string): Promise<{ success: boolean; error?: string }> {
  const { data: matchPlayers, error: fetchErr } = await supabase
    .from("match_players")
    .select("id, user_id, status")
    .eq("match_id", matchId)
    .eq("status", "confirmed");

  if (fetchErr) {
    console.error("Erro ao buscar jogadores para sorteio:", fetchErr);
    return { success: false, error: fetchErr.message };
  }

  if (!matchPlayers || matchPlayers.length === 0) {
    return { success: false, error: "Nenhum jogador confirmado para sortear" };
  }

  // Shuffle array with Fisher-Yates
  const shuffled = [...matchPlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  // Distribute strictly alternating between Team A and Team B
  const updates = shuffled.map((player, idx) => {
    const team = idx % 2 === 0 ? "A" : "B";
    return supabase
      .from("match_players")
      .update({ team, is_sub: false })
      .eq("id", player.id);
  });

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("Erro ao salvar times sorteados:", failed.error);
    return { success: false, error: failed.error.message };
  }

  return { success: true };
}
