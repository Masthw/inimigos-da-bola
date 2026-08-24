-- Awards N:M modalidades
--
-- "Craque da Partida" vale para futsal E society: a coluna única awards.game_type_id
-- não expressa pertencer a várias modalidades. A junction substitui a coluna;
-- sport_id permanece 1:N até existir multi-sport de verdade.

CREATE TABLE public.award_game_types (
  award_id bigint NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  game_type_id bigint NOT NULL REFERENCES public.game_types(id) ON DELETE CASCADE,
  PRIMARY KEY (award_id, game_type_id)
);

ALTER TABLE public.award_game_types ENABLE ROW LEVEL SECURITY;

-- Policies espelham as de public.awards (leitura pública, escrita admin).
CREATE POLICY "Leitura pública para modalidades de prêmios"
  ON public.award_game_types FOR SELECT USING (true);

CREATE POLICY "Admins criam modalidades de prêmios"
  ON public.award_game_types FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins atualizam modalidades de prêmios"
  ON public.award_game_types FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins deletam modalidades de prêmios"
  ON public.award_game_types FOR DELETE USING (public.is_admin());

-- Backfill preservando a semântica anterior:
--   game_type_id preenchido -> uma linha na junction
--   game_type_id nulo       -> vale para todas as modalidades existentes
--                              (hoje: apenas o "Craque da Partida" seedado antes)
INSERT INTO public.award_game_types (award_id, game_type_id)
SELECT id, game_type_id
FROM public.awards
WHERE game_type_id IS NOT NULL;

INSERT INTO public.award_game_types (award_id, game_type_id)
SELECT a.id, g.id
FROM public.awards a
CROSS JOIN public.game_types g
WHERE a.game_type_id IS NULL;

DROP INDEX IF EXISTS public.idx_awards_game_type_id;
ALTER TABLE public.awards DROP COLUMN game_type_id;
