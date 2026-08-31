-- Lint remediation for the Supabase dashboard warnings:
--   a) Function Search Path Mutable: functions without an explicit search_path.
--   b) Public / Signed-In Can Execute SECURITY DEFINER Function.
--
-- Strategy:
--   1) Recreate every function with a locked `SET search_path TO 'public'`.
--   2) Convert functions that don't need definer privileges to SECURITY INVOKER:
--        - is_group_admin: read-only; group_members has an open SELECT policy.
--        - tally_match_votes: only invoked by the Edge Function via the
--          service_role key (bypasses RLS).
--   3) Keep join_group_by_code as SECURITY DEFINER (a regular user must insert
--      themselves into group_members as 'pending', and the INSERT policy only
--      permits admins) but revoke EXECUTE from anon/PUBLIC, leaving only
--      authenticated. It cannot escalate privileges: it only ever inserts the
--      caller (auth.uid()) as a pending member.

-- ──────────────────────────────────────────────────────────────────────
-- 1) Recreate all functions with SET search_path TO 'public'
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se tentar alterar a role...
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Se a ação vier de um usuário logado no app (auth.uid() não é nulo) E ele não for admin, bloqueia!
    -- Se vier do Table Editor (auth.uid() é nulo), ele ignora esse IF e permite a alteração.
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.role = OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_expired_votings()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  match_record RECORD;
BEGIN
  FOR match_record IN
    SELECT id FROM matches WHERE status = 'voting' AND voting_ends_at <= now()
  LOOP
    PERFORM net.http_post(
      url := 'https://muulctiwnhasitajaamk.supabase.co/functions/v1/tally-match-votes',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dWxjdGl3bmhhc2l0YWphYW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjI1MTEsImV4cCI6MjEwMDczODUxMX0.oV1YQiUgp3mVCpKMaZig7aX1SoDdD4SFUR7n8LLv1Ng'),
      body := jsonb_build_object('matchId', match_record.id)
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_lineup_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- is_group_admin: read-only (SELECT on group_members). The table has an open
-- SELECT policy (USING true), so a signed-in user can read it directly under
-- SECURITY INVOKER. Switching avoids exposing a SECURITY DEFINER to clients.
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- join_group_by_code: MUST stay SECURITY DEFINER. It is called from the client
-- (supabase.rpc) by a regular user who inserts themselves into group_members as
-- 'pending'. The INSERT policy on group_members only permits admins, so under
-- SECURITY INVOKER a regular user would be blocked by RLS. It is safe: the
-- function only ever inserts the caller (auth.uid()) as a pending member, so no
-- privilege escalation is possible. EXECUTE is revoked from anon below.
CREATE OR REPLACE FUNCTION public.join_group_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id
  FROM public.groups
  WHERE code = p_code
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Código de grupo inválido';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role, status)
  VALUES (v_group_id, auth.uid(), 'member', 'pending')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_season_leaderboard_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- tally_match_votes: only invoked by the Edge Function via adminClient
-- (service_role key), which bypasses RLS. SECURITY INVOKER is therefore safe
-- and avoids exposing a SECURITY DEFINER to clients.
CREATE OR REPLACE FUNCTION public.tally_match_votes(
  p_match_id uuid,
  p_group_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_match_record RECORD;
  v_claimed boolean;
  v_awards awards[];
  v_players match_players[];
  v_votes match_votes[];
  v_awards_to_insert jsonb := '[]'::jsonb;
  v_awards_count int := 0;
  v_season_id int;
  v_score_a int;
  v_score_b int;
  v_result_a jsonb;
  v_result_b jsonb;
  v_craque_award_ids int[];
  v_craque_winners text[];
  v_player record;
  v_current_record RECORD;
  v_cur_points int;
  v_cur_mp int;
  v_cur_w int;
  v_cur_d int;
  v_cur_l int;
  v_match_result jsonb;
  v_extra_point int;
  v_award record;
  v_award_votes match_votes[];
  v_vote_count jsonb;
  v_sorted_candidates jsonb;
  v_top_scorer record;
  v_unique_voters int;
  v_winner_id text;
  v_winner_votes int;
  v_tied_count int;
  v_goleador_award record;
  v_garcom_award record;
  v_sorted_by_goals jsonb;
  v_top_goals record;
  v_tied_goals_count int;
  v_sorted_by_assists jsonb;
  v_top_assist record;
  v_tied_assists_count int;
  v_is_craque boolean;
  v_max_votes int;
  v_winners jsonb;
BEGIN
  -- 1. Validar partida e grupo
  SELECT id, group_id, status, game_type_id, team_a_score, team_b_score, date_time
  INTO v_match_record
  FROM matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF p_group_id IS NOT NULL AND v_match_record.group_id != p_group_id THEN
    RAISE EXCEPTION 'Partida não pertence ao grupo informado' USING ERRCODE = '42501';
  END IF;

  -- 2. Claim atômico
  IF v_match_record.status = 'finished' THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'awards_inserted', 0);
  END IF;

  UPDATE matches SET status = 'finished' WHERE id = p_match_id AND status <> 'finished';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'awards_inserted', 0);
  END IF;

  -- 3. Buscar awards da modalidade
  SELECT ARRAY_AGG(a.*) INTO v_awards
  FROM awards a
  INNER JOIN award_game_types agt ON agt.award_id = a.id
  WHERE agt.game_type_id = v_match_record.game_type_id;

  -- 4. Buscar jogadores confirmados
  SELECT ARRAY_AGG(mp.*) INTO v_players
  FROM match_players mp
  WHERE mp.match_id = p_match_id
    AND mp.status = 'confirmed'
    AND mp.user_id IS NOT NULL;

  -- 5. Buscar votos
  SELECT ARRAY_AGG(mv.*) INTO v_votes
  FROM match_votes mv
  WHERE mv.match_id = p_match_id;

  -- 6. Awards automáticos (Goleador e Garçom)
  SELECT * INTO v_goleador_award FROM unnest(v_awards) a WHERE a.name ILIKE '%goleador%';
  SELECT * INTO v_garcom_award FROM unnest(v_awards) a WHERE a.name ILIKE '%garçom%' OR a.name ILIKE '%garcom%';

  IF array_length(v_players, 1) > 0 THEN
    -- Goleador
    IF v_goleador_award.id IS NOT NULL THEN
      SELECT * INTO v_top_goals FROM unnest(v_players) p
      ORDER BY COALESCE(p.goals_scored, 0) DESC LIMIT 1;

      IF v_top_goals.goals_scored > 0 THEN
        SELECT COUNT(*) INTO v_tied_goals_count FROM unnest(v_players) p
        WHERE COALESCE(p.goals_scored, 0) = v_top_goals.goals_scored;

        IF v_tied_goals_count = 1 THEN
          v_awards_to_insert := v_awards_to_insert || jsonb_build_object(
            'match_id', p_match_id,
            'user_id', v_top_goals.user_id,
            'award_id', v_goleador_award.id
          );
        END IF;
      END IF;
    END IF;

    -- Garçom
    IF v_garcom_award.id IS NOT NULL THEN
      SELECT * INTO v_top_assist FROM unnest(v_players) p
      ORDER BY COALESCE(p.assists, 0) DESC LIMIT 1;

      IF v_top_assist.assists > 0 THEN
        SELECT COUNT(*) INTO v_tied_assists_count FROM unnest(v_players) p
        WHERE COALESCE(p.assists, 0) = v_top_assist.assists;

        IF v_tied_assists_count = 1 THEN
          v_awards_to_insert := v_awards_to_insert || jsonb_build_object(
            'match_id', p_match_id,
            'user_id', v_top_assist.user_id,
            'award_id', v_garcom_award.id
          );
        END IF;
      END IF;
    END IF;
  END IF;

  -- 7. Awards por voto
  FOR v_award IN SELECT * FROM unnest(v_awards) a WHERE a.is_voting_based = true
  LOOP
    v_is_craque := v_award.name ILIKE '%craque%';

    SELECT ARRAY_AGG(mv.*) INTO v_award_votes
    FROM unnest(v_players) p
    INNER JOIN unnest(v_votes) mv ON mv.voted_user_id = p.user_id
    WHERE mv.award_id = v_award.id;

    IF v_is_craque THEN
      -- CRAQUE: empate = ninguém ganha, zero votos = default goleador
      IF v_award_votes IS NOT NULL AND array_length(v_award_votes, 1) > 0 THEN
        SELECT voted_user_id, COUNT(*) as cnt
        INTO v_winner_id, v_winner_votes
        FROM unnest(v_award_votes)
        WHERE voted_user_id IS NOT NULL
        GROUP BY voted_user_id
        ORDER BY cnt DESC
        LIMIT 1;

        SELECT COUNT(*) INTO v_tied_count
        FROM (
          SELECT voted_user_id, COUNT(*) as cnt
          FROM unnest(v_award_votes)
          WHERE voted_user_id IS NOT NULL
          GROUP BY voted_user_id
        ) sub
        WHERE sub.cnt = v_winner_votes;

        IF v_tied_count = 1 THEN
          v_awards_to_insert := v_awards_to_insert || jsonb_build_object(
            'match_id', p_match_id,
            'user_id', v_winner_id,
            'award_id', v_award.id
          );
        END IF;
      ELSE
        -- Default: goleador ganha craque
        SELECT * INTO v_top_scorer FROM unnest(v_players) p
        ORDER BY COALESCE(p.goals_scored, 0) DESC LIMIT 1;

        IF v_top_scorer.user_id IS NOT NULL THEN
          v_awards_to_insert := v_awards_to_insert || jsonb_build_object(
            'match_id', p_match_id,
            'user_id', v_top_scorer.user_id,
            'award_id', v_award.id
          );
        END IF;
      END IF;
    ELSE
      -- OUTROS: 50%+ dos votantes e sem empate
      IF v_award_votes IS NOT NULL AND array_length(v_award_votes, 1) > 0 THEN
        SELECT COUNT(DISTINCT voter_user_id) INTO v_unique_voters
        FROM unnest(v_award_votes);

        SELECT voted_user_id, COUNT(*) as cnt
        INTO v_winner_id, v_winner_votes
        FROM unnest(v_award_votes)
        WHERE voted_user_id IS NOT NULL
        GROUP BY voted_user_id
        ORDER BY cnt DESC
        LIMIT 1;

        SELECT COUNT(*) INTO v_tied_count
        FROM (
          SELECT voted_user_id, COUNT(*) as cnt
          FROM unnest(v_award_votes)
          WHERE voted_user_id IS NOT NULL
          GROUP BY voted_user_id
        ) sub
        WHERE sub.cnt = v_winner_votes;

        IF v_winner_votes >= CEIL(v_unique_voters::numeric / 2) AND v_tied_count = 1 THEN
          v_awards_to_insert := v_awards_to_insert || jsonb_build_object(
            'match_id', p_match_id,
            'user_id', v_winner_id,
            'award_id', v_award.id
          );
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 8. Inserir awards
  IF jsonb_array_length(v_awards_to_insert) > 0 THEN
    INSERT INTO match_awards (match_id, user_id, award_id)
    SELECT (elem->>'match_id')::uuid, elem->>'user_id', (elem->>'award_id')::int
    FROM jsonb_array_elements(v_awards_to_insert) elem
    ON CONFLICT (match_id, user_id, award_id) DO NOTHING;

    GET DIAGNOSTICS v_awards_count = ROW_COUNT;
  END IF;

  -- 9. Atualizar leaderboard
  SELECT id INTO v_season_id
  FROM group_seasons
  WHERE group_id = v_match_record.group_id
    AND start_date <= v_match_record.date_time
    AND end_date >= v_match_record.date_time
  LIMIT 1;

  IF v_season_id IS NOT NULL THEN
    v_score_a := COALESCE(v_match_record.team_a_score, 0);
    v_score_b := COALESCE(v_match_record.team_b_score, 0);

    IF v_score_a > v_score_b THEN
      v_result_a := '{"w": 1, "d": 0, "l": 0, "pts": 3}'::jsonb;
      v_result_b := '{"w": 0, "d": 0, "l": 1, "pts": 0}'::jsonb;
    ELSIF v_score_b > v_score_a THEN
      v_result_a := '{"w": 0, "d": 0, "l": 1, "pts": 0}'::jsonb;
      v_result_b := '{"w": 1, "d": 0, "l": 0, "pts": 3}'::jsonb;
    ELSE
      v_result_a := '{"w": 0, "d": 1, "l": 0, "pts": 1}'::jsonb;
      v_result_b := '{"w": 0, "d": 1, "l": 0, "pts": 1}'::jsonb;
    END IF;

    -- Craque bonus
    SELECT ARRAY_AGG(award_id) INTO v_craque_award_ids
    FROM unnest(v_awards) a
    WHERE a.is_voting_based = true AND a.name ILIKE '%craque%';

    IF v_craque_award_ids IS NOT NULL THEN
      SELECT ARRAY_AGG(elem->>'user_id') INTO v_craque_winners
      FROM jsonb_array_elements(v_awards_to_insert) elem
      WHERE (elem->>'award_id')::int = ANY(v_craque_award_ids);
    END IF;

    -- Atualizar cada jogador
    FOR v_player IN SELECT * FROM unnest(v_players)
    LOOP
      IF v_player.user_id IS NULL OR v_player.team IS NULL THEN
        CONTINUE;
      END IF;

      v_match_result := CASE WHEN v_player.team = 'A' THEN v_result_a ELSE v_result_b END;
      v_extra_point := CASE WHEN v_craque_winners IS NOT NULL AND v_player.user_id = ANY(v_craque_winners) THEN 1 ELSE 0 END;

      SELECT points, matches_played, wins, draws, losses
      INTO v_cur_points, v_cur_mp, v_cur_w, v_cur_d, v_cur_l
      FROM season_leaderboards
      WHERE season_id = v_season_id AND user_id = v_player.user_id;

      INSERT INTO season_leaderboards (season_id, user_id, points, matches_played, wins, draws, losses, updated_at)
      VALUES (
        v_season_id,
        v_player.user_id,
        COALESCE(v_cur_points, 0) + (v_match_result->>'pts')::int + v_extra_point,
        COALESCE(v_cur_mp, 0) + 1,
        COALESCE(v_cur_w, 0) + (v_match_result->>'w')::int,
        COALESCE(v_cur_d, 0) + (v_match_result->>'d')::int,
        COALESCE(v_cur_l, 0) + (v_match_result->>'l')::int,
        now()
      )
      ON CONFLICT (season_id, user_id)
      DO UPDATE SET
        points = EXCLUDED.points,
        matches_played = EXCLUDED.matches_played,
        wins = EXCLUDED.wins,
        draws = EXCLUDED.draws,
        losses = EXCLUDED.losses,
        updated_at = now();
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_processed', false, 'awards_inserted', v_awards_count);
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 2) Grants: join_group_by_code remains the only SECURITY DEFINER exposed to
--    clients. Revoke EXECUTE from anon/PUBLIC so anonymous users cannot call a
--    SECURITY DEFINER function; only signed-in users (authenticated) may.
--
--    is_group_admin and tally_match_votes were converted to SECURITY INVOKER
--    above, so they no longer trigger the SECURITY DEFINER lint warnings and
--    default PUBLIC EXECUTE is harmless (RLS still protects the reads/writes).
-- ──────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.join_group_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(text) TO authenticated, service_role;
