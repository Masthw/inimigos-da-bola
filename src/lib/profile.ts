import type { User } from '@supabase/supabase-js'

export function getDisplayName(user: User | null): string {
  const meta = user?.user_metadata
  return meta?.full_name ?? meta?.name ?? user?.email ?? 'Jogador'
}

export function getAvatarUrl(user: User | null): string | null {
  const meta = user?.user_metadata
  return meta?.avatar_url ?? meta?.picture ?? null
}
