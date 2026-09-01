-- Seed de todos os awards badges definidos em src/lib/awards.ts
--
-- Apenas "Craque da Partida" existia no banco (migration 20260824143246).
-- Sem os demais, o RPC tally-match-votes nao encontra Goleador/Garcom e nem
-- eles aparecem em MatchResults. Esta migration insere todos os faltantes
-- e os linka a todas as modalidades via award_game_types.

-- 1. Inserir os awards que ainda nao existem (Craque da Partida ja existe)
WITH new_awards(name, description, is_voting_based) AS (
  VALUES
    ('Goleador',         'Artilheiro da partida',                 false),
    ('Garçom',           'Melhor assistente da partida',          false),
    ('Muralha',          'Melhor defesa da partida',                false),
    ('Motorzinho',       'Jogador mais movimentado da partida',     false),
    ('Perninha',         'Melhor chute com a perninha',             false),
    ('Frango',           'Menor desempenho da partida',             false),
    ('Cansado',          'Rends menos no jogo',                     false),
    ('Professor',        'Jogo mais inteligente da partida',        false),
    ('Fominha',          'Mais fome de gol da partida',             false),
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
