-- Fix: jogador confirmado não conseguia desistir + promoção automática da fila de espera.
--
-- Problema 1: o trigger protect_match_player_row pinava NEW.status := OLD.status para
-- qualquer edição de jogador comum. Com isso, o fluxo de desistência (upsert para
-- 'cancelled') era silenciosamente revertido e o jogador permanecia confirmado.
-- Agora o próprio jogador pode alterar APENAS o status da própria linha (confirmar /
-- desistir / entrar na espera), mantendo pinados team, is_sub e estatísticas.
--
-- Problema 2: quando alguém desiste (ou o criador remove um jogador) e a partida está
-- em open/preparing, o primeiro da fila de espera deve ser promovido automaticamente
-- para confirmed. Em partidas 'preparing' (já sorteadas) os times são re-sorteados.

-- 1) created_at em match_players para ordenar a fila de espera (FIFO)
ALTER TABLE public.match_players
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_players_waitlist_order
  ON public.match_players (match_id, status, created_at ASC, id ASC);

-- 2) sanitize_match_player_insert: respeitar waitlist e evitar furar fila
-- Antigamente forçava status := 'confirmed' em todo INSERT de jogador comum, o que
-- impedia a fila de espera de popular (entrar em partida lotada virava confirmed
-- acima do limite). Agora:
--   * status 'waitlist' explícito é respeitado;
--   * qualquer outro status vira 'waitlist' se a partida estiver cheia;
--   * vira 'confirmed' caso contrário.
CREATE OR REPLACE FUNCTION public.sanitize_match_player_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    RETURN NEW;
  END IF;

  NEW.goals_scored := 0;
  NEW.assists := 0;
  NEW.own_goals_scored := 0;
  NEW.is_sub := false;
  NEW.guest_name := NULL;
  NEW.user_id := auth.uid();

  IF NEW.status = 'waitlist' THEN
    RETURN NEW;
  END IF;

  IF (SELECT count(*) FROM public.match_players mp
      WHERE mp.match_id = NEW.match_id AND mp.status = 'confirmed')
     >= (SELECT max_players FROM public.matches m WHERE m.id = NEW.match_id) THEN
    NEW.status := 'waitlist';
  ELSE
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Trigger de proteção: jogador comum pode mudar o próprio status apenas
CREATE OR REPLACE FUNCTION public.protect_match_player_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / promoções internas / admins / organizador editam livremente
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
     OR COALESCE(current_setting('app.internal_promotion', true), 'off') = 'on'
     OR public.is_admin()
     OR public.is_group_admin(
          (SELECT group_id FROM public.matches WHERE id = OLD.match_id)
        )
     OR EXISTS (
          SELECT 1 FROM public.matches
          WHERE id = OLD.match_id AND organizer_id = auth.uid()
        )
  THEN
    RETURN NEW;
  END IF;

  -- Próprio jogador: pode alterar apenas o status (confirmar / desistir / espera).
  -- team, is_sub, convidados e estatísticas continuam imutáveis.
  IF auth.uid() = OLD.user_id THEN
    NEW.match_id := OLD.match_id;
    NEW.user_id := OLD.user_id;
    NEW.guest_name := OLD.guest_name;
    NEW.team := OLD.team;
    NEW.is_sub := OLD.is_sub;
    NEW.goals_scored := OLD.goals_scored;
    NEW.assists := OLD.assists;
    NEW.own_goals_scored := OLD.own_goals_scored;

    -- Só permite 'confirmed' se houver vaga (não furar a fila de espera)
    IF NEW.status = 'confirmed' AND (
      SELECT count(*) FROM public.match_players mp
      WHERE mp.match_id = OLD.match_id AND mp.status = 'confirmed'
    ) < (
      SELECT max_players FROM public.matches m WHERE m.id = OLD.match_id
    ) THEN
      RETURN NEW;
    END IF;

    -- cancelling / waitlist é sempre permitido para o próprio jogador
    IF NEW.status IN ('cancelled', 'waitlist') THEN
      RETURN NEW;
    END IF;

    -- tentativa de auto-promoção para 'confirmed' sem vaga: reverte
    NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  -- Qualquer outro usuário: pina tudo (não pode tocar em nada)
  NEW.match_id := OLD.match_id;
  NEW.user_id := OLD.user_id;
  NEW.guest_name := OLD.guest_name;
  NEW.team := OLD.team;
  NEW.is_sub := OLD.is_sub;
  NEW.goals_scored := OLD.goals_scored;
  NEW.assists := OLD.assists;
  NEW.own_goals_scored := OLD.own_goals_scored;
  NEW.status := OLD.status;
  RETURN NEW;
END;
$$;

-- 4) RPC: promove o primeiro da fila de espera de uma partida open/preparing.
-- Executa como SECURITY DEFINER (owner da tabela) para poder atualizar a linha de
-- outro jogador; o trigger respeita a flag app.internal_promotion.
-- Em partidas 'preparing' (já sorteadas) os times são re-sorteados de forma
-- balanceada e aleatória (A/B alternado), incluindo o recém-promovido.
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

  UPDATE public.match_players
    SET status = 'confirmed', is_sub = false, team = 'A'
    WHERE id = v_promoted.id;

  v_promoted_name := COALESCE(v_promoted.user_name, v_promoted.guest_name, 'Convidado');

  -- Partida já sorteada: re-sorteia todos os confirmados (A/B balanceado)
  IF v_match.status = 'preparing' THEN
    WITH ranked AS (
      SELECT mp.id,
             row_number() OVER (ORDER BY random()) AS rn,
             count(*) OVER () AS total
      FROM public.match_players mp
      WHERE mp.match_id = p_match_id AND mp.status = 'confirmed'
    )
    UPDATE public.match_players mp
    SET team = CASE
                 WHEN ranked.rn <= ceil(ranked.total::numeric / 2) THEN 'A'
                 ELSE 'B'
               END,
        is_sub = false
    FROM ranked
    WHERE mp.id = ranked.id;
  END IF;

  PERFORM set_config('app.internal_promotion', 'off', true);

  RETURN jsonb_build_object(
    'promoted', true,
    'playerId', v_promoted.id,
    'name', v_promoted_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_waitlist_player(uuid) TO authenticated;