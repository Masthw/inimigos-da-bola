export interface Match {
  id: string;
  date: string;
  location: string;
  status: 'scheduled' | 'in_progress' | 'finished';
  teamA_score: number;
  teamB_score: number;
  confirmed_players: number;
  max_players: number;
}