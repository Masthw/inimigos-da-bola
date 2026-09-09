import type { User } from '@supabase/supabase-js'

export function getDisplayName(user: User | null): string {
  const meta = user?.user_metadata
  return meta?.full_name ?? meta?.name ?? user?.email ?? 'Jogador'
}

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName
}

export function formatShortName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  if (!trimmed) return ''

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

  const firstName = capitalize(parts[0])
  if (parts.length === 1) {
    return firstName
  }

  const lastWord = parts[parts.length - 1]
  const lastInitial = lastWord.charAt(0).toUpperCase()
  return `${firstName} ${lastInitial}.`
}

export function getAvatarUrl(user: User | null): string | null {
  const meta = user?.user_metadata
  return meta?.avatar_url ?? meta?.picture ?? null
}
