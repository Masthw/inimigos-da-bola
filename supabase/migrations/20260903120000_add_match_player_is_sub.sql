-- Add is_sub flag to match_players and pin it in the row-protection trigger.
--
-- Rationale: the draw (generate-lineup) previously persisted substitutes with
-- team = NULL, which violates match_players_team_check (team IN ('A','B')) and
-- caused the draw to fail. From now on every confirmed player belongs to a team
-- (A or B) and substitutes are flagged with is_sub instead of team = NULL.

ALTER TABLE public.match_players
  ADD COLUMN IF NOT EXISTS is_sub boolean NOT NULL DEFAULT false;

-- Pin is_sub alongside the other tamper-proof columns so a non-admin player
-- editing their own row cannot flip themselves in/out of the lineup.
--
-- Edits are ALWAYS allowed for:
--   * service_role (the generate-lineup edge function persists the draw with it)
--   * global admins and group admins
--   * the match organizer (criador), who manages rosters/teams during prep
CREATE OR REPLACE FUNCTION public.protect_match_player_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
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

-- Allow the match organizer (criador) to manage match_players rows of their own
-- match: add/remove guests and reassign teams during preparation.
DROP POLICY IF EXISTS "Criador gerencia match_players" ON public.match_players;
CREATE POLICY "Criador gerencia match_players"
  ON public.match_players
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.organizer_id = auth.uid()
    )
  );
