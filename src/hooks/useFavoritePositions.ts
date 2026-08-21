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
  const [gameTypeIds, setGameTypeIds] = useState<{ futsal: number | null; society: number | null }>({ futsal: null, society: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    let cancelled = false
    const userId = user.id

    async function load() {
      setLoading(true)
      setError(null)

      const [{ data: positionsData }, { data: favoritesData }, { data: gameTypesData }] = await Promise.all([
        supabase.from('positions').select('id, name, code, game_type_id').order('name', { ascending: true }),
        supabase.from('user_favorite_positions').select('position_id, is_primary').eq('user_id', userId),
        supabase.from('game_types').select('id, name'),
      ])

      if (cancelled) return

      setPositions(positionsData ?? [])

      const favMap = new Map<number, FavoritePosition>()
      for (const fav of favoritesData ?? []) {
        favMap.set(fav.position_id, { position_id: fav.position_id, is_primary: fav.is_primary })
      }
      setFavorites(favMap)

      const futsal = gameTypesData?.find((gt) => gt.name.toLowerCase() === 'futsal')?.id ?? null
      const society = gameTypesData?.find((gt) => gt.name.toLowerCase() === 'society')?.id ?? null
      setGameTypeIds({ futsal, society })

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
    setError(null)

    const existing = favorites.get(positionId)
    const userId = user.id

    try {
      let dbError: { message?: string } | null = null

      if (existing) {
        const { error } = await supabase
          .from('user_favorite_positions')
          .delete()
          .eq('user_id', userId)
          .eq('position_id', positionId)
        dbError = error
      } else {
        const { error } = await supabase.from('user_favorite_positions').insert({
          user_id: userId,
          position_id: positionId,
          is_primary: isPrimary,
        })
        dbError = error
      }

      if (dbError) {
        setError(dbError.message ?? 'Erro ao salvar posição favorita')
        setSaving(false)
        return
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
    } catch {
      setError('Erro inesperado ao salvar posição favorita')
    } finally {
      setSaving(false)
    }
  }

  const getPositionsByGameType = (gameType: 'futsal' | 'society') => {
    const id = gameTypeIds[gameType]
    if (!id) return []
    return positions.filter((p) => p.game_type_id === id)
  }

  const isFavorite = (positionId: number) => {
    return favorites.has(positionId)
  }

  return {
    positions,
    favorites,
    gameTypeIds,
    loading,
    saving,
    error,
    toggleFavorite,
    getPositionsByGameType,
    isFavorite,
  }
}
