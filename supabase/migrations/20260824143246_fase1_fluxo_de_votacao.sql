-- Fase 1: fluxo de votação confiável
--
-- 1) Unique (match_id, voter_user_id, award_id): um voto por eleitor/prêmio/partida.
--    Pré-requisito do upsert no client e barreira contra corridas entre abas.
-- 2) Policies de UPDATE/DELETE em match_votes: a tabela tem RLS mas só possuía
--    INSERT/SELECT — trocar ou remover voto sempre falhava para o usuário comum.
-- 3) Seed global do award "Craque da Partida": sem ele o client usava o fallback
--    award_id = -3, que viola a FK para awards(id) e impede todo voto de Craque.

-- Dedup defensivo antes da constraint (mantém o voto mais recente; hoje a tabela está vazia).
DELETE FROM public.match_votes a
USING public.match_votes b
WHERE a.match_id = b.match_id
  AND a.voter_user_id = b.voter_user_id
  AND a.award_id = b.award_id
  AND a.id < b.id;

ALTER TABLE public.match_votes
  ADD CONSTRAINT match_votes_match_voter_award_unique
  UNIQUE (match_id, voter_user_id, award_id);

CREATE POLICY "Usuário atualiza o próprio voto"
  ON public.match_votes FOR UPDATE
  USING (auth.uid() = voter_user_id)
  WITH CHECK (auth.uid() = voter_user_id);

CREATE POLICY "Usuário remove o próprio voto"
  ON public.match_votes FOR DELETE
  USING (auth.uid() = voter_user_id);

-- Global (sport/game_type nulos): aparece para todas as modalidades, como o fallback client-side fazia.
INSERT INTO public.awards (sport_id, game_type_id, name, description, is_voting_based)
SELECT NULL, NULL, 'Craque da Partida', 'Melhor jogador da partida, eleito pelos colegas.', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.awards WHERE lower(name) LIKE '%craque%'
);
