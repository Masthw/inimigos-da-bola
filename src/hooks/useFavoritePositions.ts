import { useCallback, useEffect, useState } from 'react'
import { supabase, uniqueChannelTopic } from '../lib/supabaseClient'
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
  const [gameTypeNames, setGameTypeNames] = useState<{ futsal: string; society: string }>({ futsal: 'Futsal', society: 'Society' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetchFavorites = useCallback(async () => {
    if (!user) return

    const userId = user.id

    const [{ data: positionsData }, { data: favoritesData }, { data: gameTypesData }] = await Promise.all([
      supabase.from('positions').select('id, name, code, game_type_id').order('name', { ascending: true }),
      supabase.from('user_favorite_positions').select('position_id, is_primary').eq('user_id', userId),
      supabase.from('game_types').select('id, name'),
    ])

    setPositions(positionsData ?? [])

    const favMap = new Map<number, FavoritePosition>()
    for (const fav of favoritesData ?? []) {
      favMap.set(fav.position_id, { position_id: fav.position_id, is_primary: fav.is_primary })
    }
    setFavorites(favMap)

    const futsal = gameTypesData?.find((gt) => gt.name.toLowerCase() === 'futsal')
    const society = gameTypesData?.find((gt) => gt.name.toLowerCase() === 'society')
    setGameTypeIds({ futsal: futsal?.id ?? null, society: society?.id ?? null })
    setGameTypeNames({ futsal: futsal?.name ?? 'Futsal', society: society?.name ?? 'Society' })
  }, [user])

  const loadFavorites = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      await refetchFavorites()
    } finally {
      setLoading(false)
    }
  }, [user, refetchFavorites])

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state refresh on user change
    loadFavorites()
  }, [user, loadFavorites])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(uniqueChannelTopic(`fav-${user.id}`))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_favorite_positions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        refetchFavorites()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [user, refetchFavorites])

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
        const payload = {
          user_id: userId,
          position_id: positionId,
          is_primary: isPrimary,
        }
        const { error } = await supabase.from('user_favorite_positions').insert(payload)
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

  const getFavoritesByGameType = () => {
    const groups: { gameType: 'futsal' | 'society'; label: string; positions: Position[] }[] = []
    for (const gameType of ['futsal', 'society'] as const) {
      const gameTypeId = gameTypeIds[gameType]
      if (!gameTypeId) continue
      const positionsInType = positions.filter((p) => p.game_type_id === gameTypeId)
      const favPositions = positionsInType.filter((p) => favorites.has(p.id))
      if (favPositions.length > 0) {
        groups.push({ gameType, label: gameTypeNames[gameType], positions: favPositions })
      }
    }
    return groups
  }

  const isFavorite = (positionId: number) => {
    return favorites.has(positionId)
  }

  return {
    positions,
    favorites,
    gameTypeIds,
    gameTypeNames,
    loading,
    saving,
    error,
    toggleFavorite,
    getPositionsByGameType,
    getFavoritesByGameType,
    isFavorite,
  }
}
