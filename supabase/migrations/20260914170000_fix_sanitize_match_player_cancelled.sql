-- Fix: permitir que 'cancelled' não seja sobrescrito pelo trigger sanitize_match_player_insert
-- Quando um jogador comum desiste (seja via upsert ou insert), NEW.status = 'cancelled'
-- não deve ser convertido em 'confirmed' ou 'waitlist'.

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

  IF NEW.status IN ('waitlist', 'cancelled') THEN
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
