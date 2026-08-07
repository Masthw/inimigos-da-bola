import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { getAvatarUrl, getDisplayName } from '../lib/profile'

export function useUserProfile(userId: string | undefined) {
  const { user } = useAuth()
  const [name, setName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const targetId = userId
    if (!targetId) return

    let cancelled = false

    const load = async () => {
      const { data } = await supabase.from('users').select('id, name, avatar_url').eq('id', targetId).maybeSingle()

      if (cancelled) return

      if (data) {
        setName(data.name)
        setAvatarUrl(data.avatar_url)
      } else if (user?.id === targetId) {
        setName(getDisplayName(user))
        setAvatarUrl(getAvatarUrl(user))
      }
      setLoaded(true)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [userId, user])

  const loading = !userId ? false : !loaded

  return { name, avatarUrl, loading }
}
