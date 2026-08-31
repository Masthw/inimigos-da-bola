-- Secure group joining: enforce code-based join via RPC
--
-- 1) Remove the loose INSERT policy that allowed any user to insert themselves
--    directly into group_members.
-- 2) Create an RPC function join_group_by_code that validates the code and
--    inserts the caller as a pending member.
-- 3) Create a new INSERT policy that only allows admins to insert directly
--    (regular users must use the RPC).
-- 4) Clean up any remaining seed data from early migrations.

-- 1) Drop loose INSERT policy
DROP POLICY IF EXISTS "Admins inserem membros" ON public.group_members;

-- 2) RPC: join group by code
CREATE OR REPLACE FUNCTION public.join_group_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id
  FROM public.groups
  WHERE code = p_code
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Código de grupo inválido';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role, status)
  VALUES (v_group_id, auth.uid(), 'member', 'pending')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_group_id;
END;
$$;

-- 3) New INSERT policy: only admins can insert directly; regular users use the RPC
CREATE POLICY "Admins inserem membros" ON public.group_members
  FOR INSERT
  WITH CHECK (public.is_admin());

-- 4) Clean up seed group if it still exists
DELETE FROM public.group_members
  WHERE group_id = 'a1b2c3d4-0000-0000-0000-000000000001';

DELETE FROM public.groups
  WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';
