import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface NextMatchData {
  id: string
  title: string
  date: string
  time: string
  hour: number
  location: string
  sportName: string | null
}

const PT_BR = 'pt-BR'

function formatDate(iso: string): string {
  const formatted = new Intl.DateTimeFormat(PT_BR, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(iso),
  )
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(PT_BR, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function useNextMatch() {
  const [match, setMatch] = useState<NextMatchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('matches')
        .select('id, date_time, location, team_a_name, team_b_name, game_types(sport_id, sports(name))')
        .eq('status', 'open')
        .gte('date_time', now)
        .order('date_time', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Erro ao buscar próxima partida:', error)
        setLoading(false)
        return
      }

      if (!data) {
        setMatch(null)
        setLoading(false)
        return
      }

      const sportName = data.game_types?.sports?.name ?? null
      const title = data.team_a_name && data.team_b_name ? `${data.team_a_name} vs ${data.team_b_name}` : data.location

      setMatch({
        id: data.id,
        title,
        date: formatDate(data.date_time),
        time: formatTime(data.date_time),
        hour: new Date(data.date_time).getHours(),
        location: data.location,
        sportName,
      })
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return { match, loading }
}
