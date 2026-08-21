import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export interface Position {
  id: number
  name: string
  code: string
  game_type_id: number
}

export interface FavoritePosition {
  position_id: number
  is_primary: boolean
}

export function useFavoritePositions() {
  const { user } = useAuth()
  const [positions, setPositions] = useState<Position[]>([])
  const [favorites, setFavorites] = useState<Map<number, FavoritePosition>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function load() {
      setLoading(true)

      const [{ data: positionsData }, { data: favoritesData }] = await Promise.all([
        supabase.from('positions').select('id, name, code, game_type_id').order('name', { ascending: true }),
        supabase.from('user_favorite_positions').select('position_id, is_primary').eq('user_id', user.id),
      ])

      if (cancelled) return

      setPositions(positionsData ?? [])

      const favMap = new Map<number, FavoritePosition>()
      for (const fav of favoritesData ?? []) {
        favMap.set(fav.position_id, { position_id: fav.position_id, is_primary: fav.is_primary })
      }
      setFavorites(favMap)
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  const toggleFavorite = async (positionId: number, isPrimary: boolean) => {
    if (!user) return

    setSaving(true)

    const existing = favorites.get(positionId)

    if (existing) {
      await supabase
        .from('user_favorite_positions')
        .delete()
        .eq('user_id', user.id)
        .eq('position_id', positionId)
    } else {
      await supabase.from('user_favorite_positions').insert({
        user_id: user.id,
        position_id: positionId,
        is_primary: isPrimary,
      })
    }

    setFavorites((prev) => {
      const next = new Map(prev)
      if (existing) {
        next.delete(positionId)
      } else {
        next.set(positionId, { position_id: positionId, is_primary: isPrimary })
      }
      return next
    })

    setSaving(false)
  }

  const getPositionsByGameType = (gameTypeId: number) => {
    return positions.filter((p) => p.game_type_id === gameTypeId)
  }

  const isFavorite = (positionId: number) => {
    return favorites.has(positionId)
  }

  return {
    positions,
    favorites,
    loading,
    saving,
    toggleFavorite,
    getPositionsByGameType,
    isFavorite,
  }
}
