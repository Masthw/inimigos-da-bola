import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!user) return
    const currentUserId = user.id

    let cancelled = false

    async function check() {
      const { data: rpcResult, error } = await supabase.rpc('is_admin')

      if (cancelled) return

      if (!error && typeof rpcResult === 'boolean') {
        setIsAdmin(rpcResult)
        setChecked(true)
        return
      }

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUserId)
        .maybeSingle()

      if (cancelled) return

      setIsAdmin(data?.role === 'admin')
      setChecked(true)
    }

    check()

    return () => {
      cancelled = true
    }
  }, [user])

  const loading = authLoading || (user !== null && !checked)

  return { isAdmin, loading }
}
