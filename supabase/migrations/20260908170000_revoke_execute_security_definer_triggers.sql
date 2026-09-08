-- Revoke EXECUTE on internal SECURITY DEFINER trigger and maintenance functions.
--
-- Rationale: In PostgreSQL, functions in public are granted EXECUTE to PUBLIC by default.
-- PostgREST exposes public schema functions via RPC (/rest/v1/rpc/...), which triggers
-- the Supabase Security Advisor alert: "Signed-In Users Can Execute SECURITY DEFINER Function".
--
-- Trigger functions and background cron tasks must never be invokable directly over HTTP/REST.

-- 1. match_players row protection trigger
REVOKE EXECUTE ON FUNCTION public.protect_match_player_row() FROM public, anon, authenticated;

-- 2. group_members role protection trigger
REVOKE EXECUTE ON FUNCTION public.protect_group_membership_role() FROM public, anon, authenticated;

-- 3. close_expired_votings (scheduled maintenance task)
REVOKE EXECUTE ON FUNCTION public.close_expired_votings() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_votings() TO service_role;
