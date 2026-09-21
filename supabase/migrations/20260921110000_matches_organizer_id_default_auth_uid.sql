-- organizer_id on matches is filled from the authenticated session (auth.uid())
-- instead of being sent by the client. Idempotent: re-applying is a no-op.
ALTER TABLE public.matches
  ALTER COLUMN organizer_id SET DEFAULT auth.uid();