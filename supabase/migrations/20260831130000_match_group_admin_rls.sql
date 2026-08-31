-- Allow per-group admins to manage matches within their own group.
--
-- Previously, only global admins (users.role = 'admin') could create, update
-- or delete matches. This migration extends those RLS policies to also allow
-- group admins (group_members.role = 'admin' for the match's group_id).

DROP POLICY IF EXISTS "Apenas admins criam partidas" ON public.matches;
CREATE POLICY "Apenas admins criam partidas" ON public.matches
  FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_group_admin(group_id));

DROP POLICY IF EXISTS "Apenas admins atualizam partidas" ON public.matches;
CREATE POLICY "Apenas admins atualizam partidas" ON public.matches
  FOR UPDATE
  USING (public.is_admin() OR public.is_group_admin(group_id))
  WITH CHECK (public.is_admin() OR public.is_group_admin(group_id));

DROP POLICY IF EXISTS "Apenas admins deletam partidas" ON public.matches;
CREATE POLICY "Apenas admins deletam partidas" ON public.matches
  FOR DELETE
  USING (public.is_admin() OR public.is_group_admin(group_id));
