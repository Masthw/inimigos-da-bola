-- Group join code + cleanup duplicate groups
--
-- 1) Add 6-digit code column to groups (unique, not null)
-- 2) Generate codes for existing groups
-- 3) Delete duplicate seeded group, keep pre-existing
-- 4) Ensure target user is admin of kept group

-- 1) Add code column
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS code text;

-- 2) Generate 6-digit codes for existing groups (handle collisions via loop)
DO $$
DECLARE
  g RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR g IN SELECT id FROM public.groups WHERE code IS NULL LOOP
    LOOP
      new_code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
      SELECT EXISTS(SELECT 1 FROM public.groups WHERE code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE public.groups SET code = new_code WHERE id = g.id;
  END LOOP;
END $$;

ALTER TABLE public.groups
  ALTER COLUMN code SET NOT NULL;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_code_unique UNIQUE (code);

ALTER TABLE public.groups
  ADD CONSTRAINT groups_code_format_check
  CHECK (code ~ '^\d{6}$');

-- 3) Delete duplicate seeded group, migrate any memberships to pre-existing
DELETE FROM public.group_members
  WHERE group_id = 'a1b2c3d4-0000-0000-0000-000000000001';

DELETE FROM public.groups
  WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';

-- 4) Ensure target user is admin of pre-existing group
INSERT INTO public.group_members (group_id, user_id, role, status)
VALUES (
  '041aaf33-4b80-42e3-a6f9-6b65721ab515',
  '6010c928-80a0-4198-b77f-f11aa4247a65',
  'admin',
  'approved'
)
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'admin', status = 'approved';
