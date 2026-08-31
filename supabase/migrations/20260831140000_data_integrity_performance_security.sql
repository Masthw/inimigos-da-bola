-- Data integrity, performance, and security hardening.
--
-- Goals:
-- 1) Enforce valid data in match_players (team must be 'A' or 'B', must have
--    either user_id or guest_name).
-- 2) Prevent duplicate votes via UNIQUE constraint on match_votes.
-- 3) Add missing indexes on FKs that are frequently queried.
-- 4) Auto-update updated_at on season_leaderboards (lineups already covered).
-- 5) Revoke anon EXECUTE on is_group_admin (Supabase lint: SECURITY DEFINER
--    callable by anon).

-- ──────────────────────────────────────────────────────────────────────
-- 1) CHECK constraints on match_players
-- ──────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_players_team_check'
  ) THEN
    ALTER TABLE public.match_players
      ADD CONSTRAINT match_players_team_check
      CHECK (team IN ('A', 'B'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_players_user_or_guest_check'
  ) THEN
    ALTER TABLE public.match_players
      ADD CONSTRAINT match_players_user_or_guest_check
      CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- 2) UNIQUE constraint on match_votes to prevent duplicate votes
--    (may already exist from the earlier fase1 migration)
-- ──────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_votes_match_voter_award_unique'
  ) THEN
    ALTER TABLE public.match_votes
      ADD CONSTRAINT match_votes_match_voter_award_unique
      UNIQUE (match_id, voter_user_id, award_id);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- 3) Missing FK indexes
-- ──────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lineups_match_id
  ON public.lineups USING btree (match_id);

CREATE INDEX IF NOT EXISTS idx_lineup_players_lineup_id
  ON public.lineup_players USING btree (lineup_id);

CREATE INDEX IF NOT EXISTS idx_lineup_players_user_id
  ON public.lineup_players USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_season_leaderboards_season_id
  ON public.season_leaderboards USING btree (season_id);

CREATE INDEX IF NOT EXISTS idx_season_leaderboards_user_id
  ON public.season_leaderboards USING btree (user_id);

-- ──────────────────────────────────────────────────────────────────────
-- 4) updated_at trigger for season_leaderboards
-- ──────────────────────────────────────────────────────────────────────

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

CREATE OR REPLACE TRIGGER season_leaderboard_updated_at
  BEFORE UPDATE ON public.season_leaderboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_season_leaderboard_updated_at();

-- ──────────────────────────────────────────────────────────────────────
-- 5) Security: revoke anon EXECUTE on is_group_admin
--    The function uses auth.uid() which is NULL for anon, so it's safe
--    from a logic perspective, but the lint flags it because it's a
--    SECURITY DEFINER callable without signing in.
-- ──────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid) FROM anon;
