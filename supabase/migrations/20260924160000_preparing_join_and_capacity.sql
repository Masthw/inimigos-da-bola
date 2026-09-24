-- Permitir entrada / waitlist em partidas 'preparing' + editar capacidade + balancear times.
--
-- 1) sanitize_match_player_insert: membro entrando como 'confirmed' numa partida
--    'preparing' vai para o time com menos confirmados (desempate A). Convidados
--    (guest_name) mantêm o time escolhido pelo organizador.
-- 2) promote_waitlist_player: em 'preparing', o promovido vai para o time com
--    menos confirmados (em vez de re-sortear tudo, que desfazia ajustes manuais).
-- 3) update_match_capacity(p_match_id, p_max_players): RPC que permite ao
--    organizador (ou admins) alterar a capacidade em partidas open/preparing,
--    recusando valores menores que o nº de confirmados e promovendo
--    automaticamente a fila de espera pelas vagas abertas.
-- 4) matches.max_waitlist vira opcional: waitlist sem limite (decisão de produto).

-- ────────────────────────────────────────────────────────────────────────────
-- 4) max_waitlist opcional
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.matches
  ALTER COLUMN max_waitlist DROP NOT NULL,
  ALTER COLUMN max_waitlist SET DEFAULT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 1) sanitize_match_player_insert com balanceamento de times em 'preparing'
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sanitize_match_player_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_status public.match_status_enum;
  v_lesser_team text;
BEGIN
  SELECT m.status INTO v_match_status
    FROM public.matches m
    WHERE m.id = NEW.match_id;

  -- service_role / promoções internas / admins / organizador inserem livremente
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
     OR public.is_admin()
     OR public.is_group_admin(
          (SELECT group_id FROM public.matches WHERE id = NEW.match_id)
        )
     OR EXISTS (
          SELECT 1 FROM public.matches
          WHERE id = NEW.match_id AND organizer_id = auth.uid()
        )
  THEN
    IF NEW.guest_name IS NULL THEN
      NEW.user_id := COALESCE(NEW.user_id, auth.uid());
    END IF;

    -- Membro (não convidado) confirmado em partida já sorteada: time com menos jogadores
    IF v_match_status = 'preparing'
       AND NEW.status = 'confirmed'
       AND NEW.user_id IS NOT NULL
       AND NEW.guest_name IS NULL
    THEN
      SELECT CASE
               WHEN count(*) FILTER (WHERE team = 'B') < count(*) FILTER (WHERE team = 'A') THEN 'B'
               ELSE 'A'
             END INTO v_lesser_team
        FROM public.match_players
        WHERE match_id = NEW.match_id AND status = 'confirmed';
      NEW.team := v_lesser_team;
    END IF;

    RETURN NEW;
  END IF;

  -- Jogador comum: sanitiza e decide confirmed/waitlist
  NEW.goals_scored := 0;
  NEW.assists := 0;
  NEW.own_goals_scored := 0;
  NEW.is_sub := false;
  NEW.guest_name := NULL;
  NEW.user_id := auth.uid();

  IF NEW.status IN ('waitlist', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF (SELECT count(*) FROM public.match_players mp
      WHERE mp.match_id = NEW.match_id AND mp.status = 'confirmed')
     >= (SELECT max_players FROM public.matches m WHERE m.id = NEW.match_id) THEN
    NEW.status := 'waitlist';
  ELSE
    NEW.status := 'confirmed';
    IF v_match_status = 'preparing' THEN
      SELECT CASE
               WHEN count(*) FILTER (WHERE team = 'B') < count(*) FILTER (WHERE team = 'A') THEN 'B'
               ELSE 'A'
             END INTO v_lesser_team
        FROM public.match_players
        WHERE match_id = NEW.match_id AND status = 'confirmed';
      NEW.team := v_lesser_team;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) promote_waitlist_player: time com menos confirmados em 'preparing'
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.promote_waitlist_player(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match        record;
  v_confirmed    int;
  v_promoted     record;
  v_promoted_name text;
  v_team         text;
BEGIN
  PERFORM set_config('app.internal_promotion', 'on', true);

  SELECT * INTO v_match
    FROM public.matches m
    WHERE m.id = p_match_id;

  IF v_match.id IS NULL OR v_match.status NOT IN ('open', 'preparing') THEN
    PERFORM set_config('app.internal_promotion', 'off', true);
    RETURN jsonb_build_object('promoted', false, 'reason', 'partida nao aceita alteracoes');
  END IF;

  SELECT count(*) INTO v_confirmed
    FROM public.match_players
    WHERE match_id = p_match_id AND status = 'confirmed';

  IF v_confirmed >= v_match.max_players THEN
    PERFORM set_config('app.internal_promotion', 'off', true);
    RETURN jsonb_build_object('promoted', false, 'reason', 'sem vaga');
  END IF;

  SELECT mp.id, mp.user_id, mp.guest_name, u.name AS user_name
    INTO v_promoted
    FROM public.match_players mp
    LEFT JOIN public.users u ON u.id = mp.user_id
    WHERE mp.match_id = p_match_id AND mp.status = 'waitlist'
    ORDER BY mp.created_at ASC, mp.id ASC
    LIMIT 1;

  IF v_promoted.id IS NULL THEN
    PERFORM set_config('app.internal_promotion', 'off', true);
    RETURN jsonb_build_object('promoted', false, 'reason', 'sem espera');
  END IF;

  IF v_match.status = 'preparing' THEN
    SELECT CASE
             WHEN count(*) FILTER (WHERE team = 'B') < count(*) FILTER (WHERE team = 'A') THEN 'B'
             ELSE 'A'
           END INTO v_team
      FROM public.match_players
      WHERE match_id = p_match_id AND status = 'confirmed';
  ELSE
    v_team := 'A';
  END IF;

  UPDATE public.match_players
    SET status = 'confirmed', is_sub = false, team = v_team
    WHERE id = v_promoted.id;

  v_promoted_name := COALESCE(v_promoted.user_name, v_promoted.guest_name, 'Convidado');

  PERFORM set_config('app.internal_promotion', 'off', true);

  RETURN jsonb_build_object(
    'promoted', true,
    'playerId', v_promoted.id,
    'name', v_promoted_name,
    'team', v_team
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) update_match_capacity: muda capacidade e promove a fila de espera
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_match_capacity(p_match_id uuid, p_max_players integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match        record;
  v_confirmed    int;
  v_promoted     record;
  v_promoted_names text[] := '{}';
  v_promoted_count int := 0;
BEGIN
  SELECT * INTO v_match
    FROM public.matches m
    WHERE m.id = p_match_id;

  IF v_match.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'partida nao encontrada');
  END IF;

  IF v_match.status NOT IN ('open', 'preparing') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'partida nao aceita alteracoes');
  END IF;

  IF NOT (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
      OR public.is_admin()
      OR public.is_group_admin(v_match.group_id)
      OR v_match.organizer_id = auth.uid())
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sem permissao');
  END IF;

  IF p_max_players IS NULL OR p_max_players < 1 OR p_max_players > 99 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'capacidade invalida');
  END IF;

  SELECT count(*) INTO v_confirmed
    FROM public.match_players
    WHERE match_id = p_match_id AND status = 'confirmed';

  IF p_max_players < v_confirmed THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'capacidade menor que confirmados',
      'confirmed', v_confirmed
    );
  END IF;

  UPDATE public.matches SET max_players = p_max_players WHERE id = p_match_id;

  PERFORM set_config('app.internal_promotion', 'on', true);

  -- Promove da fila de espera uma vaga por vez enquanto houver vaga e espera
  LOOP
    SELECT count(*) INTO v_confirmed
      FROM public.match_players
      WHERE match_id = p_match_id AND status = 'confirmed';

    IF v_confirmed >= p_max_players THEN
      EXIT;
    END IF;

    SELECT mp.id,
           COALESCE(u.name, mp.guest_name, 'Convidado') AS name
      INTO v_promoted
      FROM public.match_players mp
      LEFT JOIN public.users u ON u.id = mp.user_id
      WHERE mp.match_id = p_match_id AND mp.status = 'waitlist'
      ORDER BY mp.created_at ASC, mp.id ASC
      LIMIT 1;

    IF v_promoted.id IS NULL THEN
      EXIT;
    END IF;

    PERFORM public.promote_waitlist_player(p_match_id);
    v_promoted_names := array_append(v_promoted_names, v_promoted.name);
    v_promoted_count := v_promoted_count + 1;
  END LOOP;

  PERFORM set_config('app.internal_promotion', 'off', true);

  RETURN jsonb_build_object(
    'ok', true,
    'maxPlayers', p_max_players,
    'promotedCount', v_promoted_count,
    'promoted', v_promoted_names
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_match_capacity(uuid, integer) TO authenticated;