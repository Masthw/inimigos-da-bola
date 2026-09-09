-- Fase 2: privacidade — esconder email e isolar grupos
--
-- 1) Column-level GRANT na tabela users: authenticated só lê
--    (id, name, avatar_url, role, created_at, deleted_at). Email fica
--    protegido contra SELECT via API.
-- 2) Função is_group_member(uuid): retorna true se auth.uid() for membro
--    aprovado do grupo informado. SECURITY DEFINER para ler group_members
--    sem depender de RLS na própria tabela.
-- 3) Policies SELECT substituídas: cada tabela de grupo agora exige
--    membership aprovado. Tabelas globais (awards, game_types, positions,
--    sports) mantêm leitura pública.

-- ──────────────────────────────────────────────
-- 1. Column-level GRANT: esconder email
-- ──────────────────────────────────────────────

REVOKE SELECT ON public.users FROM authenticated, anon;
GRANT SELECT (id, name, avatar_url, role, created_at, deleted_at)
  ON public.users TO authenticated, anon;

-- ──────────────────────────────────────────────
-- 2. Helper: is_group_member(group_id)
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;

-- ──────────────────────────────────────────────
-- 3. Policies SELECT com membership check
-- ──────────────────────────────────────────────

-- groups
DROP POLICY IF EXISTS "Grupos visíveis para todos" ON public.groups;
CREATE POLICY "Membros veem seus grupos"
  ON public.groups FOR SELECT
  USING (public.is_group_member(id));

-- group_members
DROP POLICY IF EXISTS "Membros visíveis para todos" ON public.group_members;
CREATE POLICY "Membros veem membros do seu grupo"
  ON public.group_members FOR SELECT
  USING (public.is_group_member(group_id));

-- matches
DROP POLICY IF EXISTS "Partidas visíveis para todos" ON public.matches;
CREATE POLICY "Membros veem partidas do seu grupo"
  ON public.matches FOR SELECT
  USING (public.is_group_member(group_id));

-- match_players (join through matches)
DROP POLICY IF EXISTS "Lista de presença visível para todos" ON public.match_players;
CREATE POLICY "Membros veem jogadores do seu grupo"
  ON public.match_players FOR SELECT
  USING (
    public.is_group_member(
      (SELECT m.group_id FROM public.matches m WHERE m.id = match_id)
    )
  );

-- match_votes (join through matches)
DROP POLICY IF EXISTS "Votos visíveis para todos" ON public.match_votes;
CREATE POLICY "Membros veem votos do seu grupo"
  ON public.match_votes FOR SELECT
  USING (
    public.is_group_member(
      (SELECT m.group_id FROM public.matches m WHERE m.id = match_id)
    )
  );

-- group_seasons
DROP POLICY IF EXISTS "Temporadas visíveis para todos" ON public.group_seasons;
CREATE POLICY "Membros veem temporadas do seu grupo"
  ON public.group_seasons FOR SELECT
  USING (public.is_group_member(group_id));

-- season_leaderboards (join through group_seasons)
DROP POLICY IF EXISTS "Leaderboard viewable by everyone" ON public.season_leaderboards;
CREATE POLICY "Membros veem leaderboard do seu grupo"
  ON public.season_leaderboards FOR SELECT
  USING (
    public.is_group_member(
      (SELECT gs.group_id FROM public.group_seasons gs WHERE gs.id = season_id)
    )
  );

-- season_awards (join through group_seasons)
DROP POLICY IF EXISTS "Prêmios de temporada visíveis para todos" ON public.season_awards;
CREATE POLICY "Membros veem prêmios de temporada do seu grupo"
  ON public.season_awards FOR SELECT
  USING (
    public.is_group_member(
      (SELECT gs.group_id FROM public.group_seasons gs WHERE gs.id = season_id)
    )
  );

-- match_awards (join through matches)
DROP POLICY IF EXISTS "Prêmios de partida visíveis para todos" ON public.match_awards;
CREATE POLICY "Membros veem prêmios de partida do seu grupo"
  ON public.match_awards FOR SELECT
  USING (
    public.is_group_member(
      (SELECT m.group_id FROM public.matches m WHERE m.id = match_id)
    )
  );
