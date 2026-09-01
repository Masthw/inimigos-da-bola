-- Seed de todos os awards badges definidos em src/lib/awards.ts
--
-- Apenas "Craque da Partida" existia no banco (migration 20260824143246).
-- Sem os demais, o RPC tally-match-votes nao encontra Goleador/Garcom e nem
-- eles aparecem em MatchResults. Esta migration insere todos os faltantes
-- e os linka a todas as modalidades via award_game_types.

-- 1. Inserir os awards que ainda nao existem (Craque da Partida ja existe)
--    is_voting_based = true apenas para os eleitos por voto popular.
--    Goleador/Garçom sao definidos pelas stats (gols/assistencias) e
--    Inimigo da Bola e escolhido apenas por admins.
WITH new_awards(name, description, is_voting_based) AS (
  VALUES
    ('Goleador',         'Artilheiro da partida',                 false),
    ('Garçom',           'Melhor assistente da partida',          false),
    ('Muralha',          'Melhor defesa da partida',                true),
    ('Motorzinho',       'Jogador mais movimentado da partida',     true),
    ('Perninha',         'Melhor chute com a perninha',             true),
    ('Frango',           'Menor desempenho da partida',             true),
    ('Cansado',          'Rends menos no jogo',                     true),
    ('Professor',        'Jogo mais inteligente da partida',        true),
    ('Fominha',          'Mais fome de gol da partida',             true),
    ('Inimigo da Bola',  'Melhor marcador da partida',              false)
)
INSERT INTO awards (sport_id, name, description, is_voting_based)
SELECT NULL, name, description, is_voting_based
FROM new_awards
WHERE NOT EXISTS (
  SELECT 1 FROM awards
  WHERE lower(awards.name) = lower(new_awards.name)
);

-- 2. Linkar cada award ao todas as modalidades (CROSS JOIN game_types)
INSERT INTO award_game_types (award_id, game_type_id)
SELECT a.id, g.id
FROM awards a
CROSS JOIN game_types g
WHERE a.name IN (
  'Goleador', 'Garçom', 'Muralha', 'Motorzinho', 'Perninha',
  'Frango', 'Cansado', 'Professor', 'Fominha', 'Inimigo da Bola'
)
ON CONFLICT (award_id, game_type_id) DO NOTHING;
