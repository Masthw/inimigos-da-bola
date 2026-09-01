-- Security & permission hardening.
--
-- Fixes found in field-test review:
--   1) match_players: non-admin players (and group admins) could not update
--      tactical_position — the only UPDATE policy demanded global is_admin().
--      Now group admins of the match's group can edit the roster/positions and
--      a player can edit their OWN row, but a trigger pins stats columns so a
--      regular user cannot tamper with goals/team/status.
--   2) generate-lineup / tally-match-votes edge functions now accept group
--      admins (fixed in TS; this migration only hardens the DB side).
--   4) group_members: a regular member could UPDATE their own row to
--      role='admin' (RLS is row-level, not column-level). A trigger now pins
--      the role column for non-admin callers.
--   5/8) match_votes: INSERT only validated voter == auth.uid(). Now the voter
--      must be a confirmed player of the match, the voted user must be a
--      confirmed player (rejects guests), the award must be voting-based and
--      belong to the match's game type, and the vote window must still be open
--      (voting_ends_at not yet passed).
--   6) tally_match_votes is only called by the Edge Function via service_role
--      (bypasses RLS). Revoke EXECUTE from anon/authenticated.
--   3) close_expired_votings was scheduled nowhere and used a committed anon
--      JWT + net.http that always 403'd. Rebuilt as SECURITY DEFINER that runs
--      the tally in-DB (no HTTP, no committed key) and scheduled via pg_cron.
--      is_admin() EXECUTE revoked from anon (dead surface).

-- ────────────────────────────────────────────────────────────────────────────
-- 1) match_players RLS: enable group admins + self, keep stats tamper-proof
-- ────────────────────────────────────────────────────────────────────────────

-- Allow global admins AND group admins of the match's group to update roster.
DROP POLICY IF EXISTS "Atualização de estatísticas" ON public.match_players;
CREATE POLICY "Estatísticas por admins do grupo"
  ON public.match_players
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.is_group_admin((SELECT group_id FROM public.matches WHERE id = match_id))
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_group_admin((SELECT group_id FROM public.matches WHERE id = match_id))
  );

-- Allow a player to update their OWN row (used to set their tactical position).
DROP POLICY IF EXISTS "Jogador atualiza a própria linha" ON public.match_players;
CREATE POLICY "Jogador atualiza a própria linha"
  ON public.match_players
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pin all columns except tactical_position for non-admin edits, so a player who
-- updates their own row cannot inflate goals/assists or switch teams.
CREATE OR REPLACE FUNCTION public.protect_match_player_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR public.is_group_admin(
       (SELECT group_id FROM public.matches WHERE id = OLD.match_id)
     ) THEN
    RETURN NEW;
  END IF;

  NEW.match_id := OLD.match_id;
  NEW.user_id := OLD.user_id;
  NEW.guest_name := OLD.guest_name;
  NEW.team := OLD.team;
  NEW.goals_scored := OLD.goals_scored;
  NEW.assists := OLD.assists;
  NEW.own_goals_scored := OLD.own_goals_scored;
  NEW.status := OLD.status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_match_player_row ON public.match_players;
CREATE TRIGGER trg_protect_match_player_row
  BEFORE UPDATE ON public.match_players
  FOR EACH ROW EXECUTE FUNCTION public.protect_match_player_row();

-- ────────────────────────────────────────────────────────────────────────────
-- 4) group_members: pin role so a member cannot self-promote to admin
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_group_membership_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR public.is_group_admin(NEW.group_id) THEN
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_group_membership_role ON public.group_members;
CREATE TRIGGER trg_protect_group_membership_role
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_group_membership_role();

-- Drop the self-update UPDATE policy that allowed a member to change their own
-- row directly under RLS. Self "leave" is handled by the status check below,
-- but a member should not be able to toggle arbitrary fields on their row.
DROP POLICY IF EXISTS "Admins atualizam membros" ON public.group_members;
CREATE POLICY "Admins atualizam membros" ON public.group_members
  FOR UPDATE
  USING (public.is_admin() OR public.is_group_admin(group_id))
  WITH CHECK (public.is_admin() OR public.is_group_admin(group_id));

-- ────────────────────────────────────────────────────────────────────────────
-- 5/8) match_votes: require confirmed player on both sides + valid award + open window
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Usuário vota apenas como si mesmo" ON public.match_votes;
CREATE POLICY "Voto com validação de participação"
  ON public.match_votes
  FOR INSERT
  WITH CHECK (
    auth.uid() = voter_user_id
    AND EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = match_votes.match_id
        AND mp.user_id = match_votes.voter_user_id
        AND mp.status = 'confirmed'
    )
    AND EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = match_votes.match_id
        AND mp.user_id = match_votes.voted_user_id
        AND mp.status = 'confirmed'
    )
    AND EXISTS (
      SELECT 1
      FROM public.awards a
      INNER JOIN public.award_game_types agt ON agt.award_id = a.id
      INNER JOIN public.matches m ON m.id = match_votes.match_id
      WHERE a.id = match_votes.award_id
        AND a.is_voting_based = true
        AND agt.game_type_id = m.game_type_id
    )
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_votes.match_id
        AND (m.voting_ends_at IS NULL OR m.voting_ends_at > now())
    )
  );

-- Keep edit/update of a vote consistent with the same validation.
DROP POLICY IF EXISTS "Usuário atualiza o próprio voto" ON public.match_votes;
CREATE POLICY "Usuário atualiza o próprio voto"
  ON public.match_votes
  FOR UPDATE
  USING (auth.uid() = voter_user_id)
  WITH CHECK (
    auth.uid() = voter_user_id
    AND EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = match_votes.match_id
        AND mp.user_id = match_votes.voted_user_id
        AND mp.status = 'confirmed'
    )
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_votes.match_id
        AND (m.voting_ends_at IS NULL OR m.voting_ends_at > now())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 6) tally_match_votes: only service_role (Edge Function) may call it
-- ────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.tally_match_votes(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tally_match_votes(uuid, uuid) TO service_role;

-- is_admin(): no EXECUTE for anon (dead surface; auth.uid() is null for anon).
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) close_expired_votings: run tally in-DB (no HTTP/anon key) + schedule cron
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.close_expired_votings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_record RECORD;
BEGIN
  FOR match_record IN
    SELECT id FROM public.matches
    WHERE status = 'voting' AND voting_ends_at <= now()
  LOOP
    PERFORM public.tally_match_votes(match_record.id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_expired_votings() TO service_role;

-- Schedule every minute while the extension is present. Re-applying the
-- migration is idempotent: if the named job already exists we drop it first;
-- if it does not exist yet, cron.unschedule raises and we swallow it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('close-expired-votings');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule('close-expired-votings', '* * * * *', 'SELECT public.close_expired_votings()');
  END IF;
END;
$$;