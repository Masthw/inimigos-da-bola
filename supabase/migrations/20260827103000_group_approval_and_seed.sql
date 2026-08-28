-- Fase 3 continuação: sistema de aprovação de membros + grupo padrão
--
-- 1) Adiciona status em group_members (pending/approved/rejected)
-- 2) Cria grupo padrão "Inimigos da Bola" com admin seed
-- 3) Ajusta RLS: usuário pode inserir a si mesmo (join por code) e atualizar próprio status

-- 1) Status column
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.group_members
  ADD CONSTRAINT group_members_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Backfill: existing rows are approved (already)
-- New joins via code will be inserted as 'pending'

-- 2) Seed grupo padrão
INSERT INTO public.groups (id, name, description)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Inimigos da Bola',
  'Grupo padrão do app'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_members (group_id, user_id, role, status)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  '6010c928-80a0-4198-b77f-f11aa4247a65',
  'admin',
  'approved'
)
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'admin', status = 'approved';

-- 3) RLS: permite usuário inserir a si mesmo (join por código)
DROP POLICY IF EXISTS "Admins inserem membros" ON public.group_members;
CREATE POLICY "Admins inserem membros" ON public.group_members
  FOR INSERT
  WITH CHECK (is_admin() OR auth.uid() = user_id);

-- RLS: permite usuário atualizar próprio status (ex: sair do grupo)
DROP POLICY IF EXISTS "Admins atualizam membros" ON public.group_members;
CREATE POLICY "Admins atualizam membros" ON public.group_members
  FOR UPDATE
  USING (is_admin() OR auth.uid() = user_id)
  WITH CHECK (is_admin() OR auth.uid() = user_id);
