-- Add per-group admin role helpers and surface group role in queries.
--
-- Goals:
-- 1) Allow multiple admins per group (already possible via group_members.role).
-- 2) Expose helpers so the client can know if the current user is admin of a
--    specific group, and so RLS can use the same check.
-- 3) Let RLS INSERT on group_members allow the group's own admins (so they can
--    promote/demote members) in addition to the previous global-admin rule.

-- 1) Helper: is the current user an admin of the given group?
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO anon, authenticated, service_role;

-- 2) Allow the group's own admins to insert members into that group
--    (promoting existing users, etc.), in addition to global admins.
DROP POLICY IF EXISTS "Admins inserem membros" ON public.group_members;
CREATE POLICY "Admins inserem membros" ON public.group_members
  FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_group_admin(group_id));

-- 3) Allow the group's own admins to update members of that group
--    (approve/reject, change role), in addition to global admins.
DROP POLICY IF EXISTS "Admins atualizam membros" ON public.group_members;
CREATE POLICY "Admins atualizam membros" ON public.group_members
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.is_group_admin(group_id)
    OR auth.uid() = user_id
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_group_admin(group_id)
    OR auth.uid() = user_id
  );

-- 4) Allow the group's own admins to delete members from that group,
--    in addition to global admins.
DROP POLICY IF EXISTS "Admins deletam membros" ON public.group_members;
CREATE POLICY "Admins deletam membros" ON public.group_members
  FOR DELETE
  USING (public.is_admin() OR public.is_group_admin(group_id));
