-- Fase 3: funcionalidade — self-leave e limpeza das tabelas de lineups
--
-- 1) group_members: membro pode deletar a própria linha (sair do grupo).
--    Admins continuam podendo remover qualquer membro (policy existente).
-- 2) lineups/lineup_players: excluídas. Não são usadas no client, tinham
--    RLS habilitado sem nenhuma policy (feature morta). Remove também o
--    trigger/função dedicados e o vínculo na publication supabase_realtime.

-- ──────────────────────────────────────────────
-- 1. Self-leave: membro sai do próprio grupo
-- ──────────────────────────────────────────────

CREATE POLICY "Membro sai do grupo"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 2. Excluir lineups / lineup_players
-- ──────────────────────────────────────────────

DROP TRIGGER IF EXISTS lineup_updated_at ON public.lineups;
DROP FUNCTION IF EXISTS public.update_lineup_updated_at();

ALTER PUBLICATION supabase_realtime DROP TABLE public.lineup_players;
ALTER PUBLICATION supabase_realtime DROP TABLE public.lineups;

DROP TABLE IF EXISTS public.lineup_players;
DROP TABLE IF EXISTS public.lineups;