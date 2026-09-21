-- Fix: preencher user_id no ramo privilegiado do trigger sanitize_match_player_insert.
--
-- Causa raiz (23514 match_players_user_or_guest_check):
--   O cliente deixou de enviar user_id (fix de segurança: a coluna de autorização
--   pertence ao servidor). O ramo privilegiado do trigger (service_role, admin,
--   group admin ou organizer) retornava NEW inalterado, então, no auto-inscrição
--   de um organizer/admin, user_id e guest_name ficavam NULL -> violava a CHECK
--   (user_id IS NOT NULL OR guest_name IS NOT NULL).
--
-- Comportamento preservado:
--   * organizer/admin confirmando a PRÓPRIA presença sem user_id -> COALESCE
--     preenche auth.uid().
--   * admin inserindo um OUTRO jogador (user_id informado) -> mantém o valor.
--   * admin adicionando convidado (user_id NULL + guest_name set) -> não altera.
--   * service_role sem auth.uid() deve informar user_id explicitamente (server-side).
--   * jogador comum segue o caminho que força NEW.user_id := auth.uid().

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
    IF NEW.guest_name IS NULL THEN
      NEW.user_id := COALESCE(NEW.user_id, auth.uid());
    END IF;
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