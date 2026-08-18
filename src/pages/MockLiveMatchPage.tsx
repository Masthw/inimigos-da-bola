import { useState } from 'react'
import { AppShell } from '../components/ui/AppShell'
import { LiveMatchView } from '../components/match/LiveMatchView'
import { TeamColorPicker } from '../components/match/TeamColorPicker'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import type { MatchPlayer } from '../hooks/useMatches'

const MOCK_PLAYERS_A: MatchPlayer[] = [
  { userId: 'mock-1', name: 'Matheus', avatarUrl: null, team: 'A' },
  { userId: 'mock-2', name: 'Lucas', avatarUrl: null, team: 'A' },
  { userId: 'mock-3', name: 'Pedro', avatarUrl: null, team: 'A' },
  { userId: 'mock-4', name: 'Gabriel', avatarUrl: null, team: 'A' },
  { userId: 'mock-5', name: 'Rafael', avatarUrl: null, team: 'A' },
  { userId: 'mock-6', name: 'Thiago', avatarUrl: null, team: 'A' },
]

const MOCK_PLAYERS_B: MatchPlayer[] = [
  { userId: 'mock-7', name: 'Bruno', avatarUrl: null, team: 'B' },
  { userId: 'mock-8', name: 'Felipe', avatarUrl: null, team: 'B' },
  { userId: 'mock-9', name: 'João', avatarUrl: null, team: 'B' },
  { userId: 'mock-10', name: 'Diego', avatarUrl: null, team: 'B' },
  { userId: 'mock-11', name: 'Carlos', avatarUrl: null, team: 'B' },
  { userId: 'mock-12', name: 'André', avatarUrl: null, team: 'B' },
]

type Phase = 'colors' | 'live'

export default function MockLiveMatchPage() {
  const [phase, setPhase] = useState<Phase>('colors')
  const [teamAColor, setTeamAColor] = useState('#ef4444')
  const [teamBColor, setTeamBColor] = useState('#3b82f6')
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)

  const handleGoalScored = (scorer: MatchPlayer, _assist: MatchPlayer | null) => {
    if (scorer.team === 'A') setScoreA((s) => s + 1)
    else setScoreB((s) => s + 1)
  }

  const handleOwnGoal = (teamBenefited: string) => {
    if (teamBenefited === 'A') setScoreA((s) => s + 1)
    else setScoreB((s) => s + 1)
  }

  const handleFinish = (finalA: number, finalB: number) => {
    setScoreA(finalA)
    setScoreB(finalB)
    alert(`Partida finalizada! ${finalA} x ${finalB}`)
  }

  if (phase === 'colors') {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex flex-col">
          <header className="flex items-center px-4 py-3 border-b border-outline-variant bg-surface-container">
            <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase">Test Live</h2>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full">
            <div className="w-full bg-surface-container rounded-2xl p-6 border border-outline-variant space-y-8">
              <div className="text-center space-y-2">
                <MaterialIcon name="palette" className="w-8 h-8 text-primary mx-auto" />
                <h3 className="text-headline-md font-display uppercase text-on-surface">Cores dos Times</h3>
                <p className="font-mono text-label-sm text-on-surface-variant">
                  Selecione as cores para cada time (como coletes)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <TeamColorPicker
                  label="Time A"
                  selectedColor={teamAColor}
                  onSelect={setTeamAColor}
                  excludeColor={teamBColor}
                />
                <TeamColorPicker
                  label="Time B"
                  selectedColor={teamBColor}
                  onSelect={setTeamBColor}
                  excludeColor={teamAColor}
                />
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded" style={{ backgroundColor: teamAColor }} />
                  <span className="font-mono text-label-sm text-on-surface">vs</span>
                  <span className="w-6 h-6 rounded" style={{ backgroundColor: teamBColor }} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPhase('live')}
                className="w-full py-3 bg-primary text-on-primary font-mono text-label-bold brutal-shadow brutal-shadow-hover transition-transform"
              >
                Iniciar Partida
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <LiveMatchView
        matchId="mock-match"
        teamAName="Inimigos da Bola"
        teamBName="Grêmio"
        teamAColor={teamAColor}
        teamBColor={teamBColor}
        teamAScore={scoreA}
        teamBScore={scoreB}
        teamAPlayers={MOCK_PLAYERS_A}
        teamBPlayers={MOCK_PLAYERS_B}
        onGoalScored={handleGoalScored}
        onOwnGoal={handleOwnGoal}
        onFinish={handleFinish}
      />
    </AppShell>
  )
}
