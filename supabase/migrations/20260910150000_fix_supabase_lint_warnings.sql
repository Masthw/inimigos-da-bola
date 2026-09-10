-- Fix Supabase Linter Warnings:
-- 1) Extension in Public (pg_net): drop and recreate in 'extensions' schema
--    (pg_net is not relocatable via SET SCHEMA, so drop & recreate is required).
-- 2) Public Can Execute SECURITY DEFINER (is_group_admin & is_group_member):
--    Revoke execute permissions from public and anon roles to eliminate unauthenticated RPC surface.
-- 3) Document that join_group_by_code, is_group_admin, and is_group_member intentionally retain
--    GRANT EXECUTE TO authenticated because:
--    - join_group_by_code is the RPC used by non-members to request joining a group.
--    - is_group_admin & is_group_member are required by authenticated users during RLS evaluation.

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Recreate pg_net in extensions schema
-- ────────────────────────────────────────────────────────────────────────────
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Revoke unauthenticated execution of SECURITY DEFINER functions
-- ────────────────────────────────────────────────────────────────────────────

-- is_group_admin
REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO authenticated, service_role;

-- is_group_member
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated, service_role;

-- join_group_by_code (guarantee only authenticated + service_role can call it)
REVOKE EXECUTE ON FUNCTION public.join_group_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(text) TO authenticated, service_role;
