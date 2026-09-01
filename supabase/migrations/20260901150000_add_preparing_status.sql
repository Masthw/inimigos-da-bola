-- Add 'preparing' match status between 'open' and 'in_progress'
--
-- After startMatch draws teams, the match enters 'preparing' so the admin
-- can define the escalação/tactical lineup before the game goes live
-- ('in_progress').  This avoids jumping straight from team draw to the
-- live match screen, giving the organizer a chance to confirm positions.

ALTER TYPE match_status_enum ADD VALUE IF NOT EXISTS 'preparing';
