import { useEffect, useReducer } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/ui/AppShell";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import { VoteResult } from "../components/voting/VoteResult";
import { MatchErrorState } from "../components/match/MatchErrorState";
import { supabase } from "../lib/supabaseClient";

interface AwardResult {
  awardName: string;
  winnerName: string | null;
  winnerId: string | null;
  winnerAvatarUrl?: string | null;
  voteCount: number;
  isAutomatic: boolean;
  givesPoints: boolean;
}

interface MatchResultsState {
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  results: AwardResult[];
  loading: boolean;
  error: string | null;
}

type MatchResultsAction =
  | { type: "fetchStart" }
  | { type: "fetchSuccess"; payload: Omit<MatchResultsState, "loading" | "error"> }
  | { type: "fetchError"; payload: string };

const initialState: MatchResultsState = {
  teamAName: "",
  teamBName: "",
  teamAScore: 0,
  teamBScore: 0,
  results: [],
  loading: true,
  error: null,
};

function reducer(state: MatchResultsState, action: MatchResultsAction): MatchResultsState {
  switch (action.type) {
    case "fetchStart":
      return { ...state, loading: true, error: null };
    case "fetchSuccess":
      return { ...state, ...action.payload, loading: false };
    case "fetchError":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export default function MatchResults() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState, (init) => ({
    ...init,
    loading: matchId != null,
    error: matchId == null ? "Partida não encontrada" : null,
  }));

  const { teamAName, teamBName, teamAScore, teamBScore, results, loading, error } = state;

  useEffect(() => {
    const id = matchId ?? "";
    if (!id) return;

    let cancelled = false;

    async function fetchResults() {
      dispatch({ type: "fetchStart" });

      const [matchRes, matchAwardsRes, awardsRes, votesRes, playersRes] = await Promise.all([
        supabase
          .from("matches")
          .select("team_a_name, team_b_name, team_a_score, team_b_score")
          .eq("id", id)
          .single(),
        supabase
          .from("match_awards")
          .select("award_id, user_id")
          .eq("match_id", id),
        supabase
          .from("awards")
          .select("id, name, is_voting_based"),
        supabase
          .from("match_votes")
          .select("award_id, voted_user_id")
          .eq("match_id", id),
        supabase
          .from("match_players")
          .select("user_id, guest_name, users(name, avatar_url)")
          .eq("match_id", id)
          .eq("status", "confirmed"),
      ]);

      if (cancelled) return;

      if (matchRes.error || !matchRes.data) {
        dispatch({ type: "fetchError", payload: "Partida não encontrada" });
        return;
      }

      const playerMap = new Map<string, string>();
      const avatarMap = new Map<string, string | null>();
      playersRes.data?.forEach((p) => {
        const pid = p.user_id ?? "";
        const name = (Array.isArray(p.users) ? p.users[0]?.name : p.users?.name) ?? p.guest_name ?? "Convidado";
        const avatar = (Array.isArray(p.users) ? p.users[0]?.avatar_url : p.users?.avatar_url) ?? null;
        playerMap.set(pid, name);
        avatarMap.set(pid, avatar);
      });

      const voteCountsByAward = new Map<number, Map<string, number>>();
      votesRes.data?.forEach((v) => {
        if (!v.voted_user_id) return;
        if (!voteCountsByAward.has(v.award_id)) {
          voteCountsByAward.set(v.award_id, new Map());
        }
        const awardVotes = voteCountsByAward.get(v.award_id)!;
        awardVotes.set(v.voted_user_id, (awardVotes.get(v.voted_user_id) || 0) + 1);
      });

      const winnerByAward = new Map<number, string>();
      matchAwardsRes.data?.forEach((ma) => {
        winnerByAward.set(ma.award_id, ma.user_id);
      });

      const awardResults: AwardResult[] = [];
      for (const award of awardsRes.data ?? []) {
        if (award.name.toLowerCase().includes("inimigo da bola")) continue;
        const winnerId = winnerByAward.get(award.id);
        if (!winnerId) continue;

        const winnerName = playerMap.get(winnerId) ?? "Jogador";
        const winnerAvatarUrl = avatarMap.get(winnerId) ?? null;

        const awardVoteMap = voteCountsByAward.get(award.id);
        const winnerVoteCount = awardVoteMap ? (awardVoteMap.get(winnerId) ?? 0) : 0;
        const isCraque = award.name.toLowerCase().includes("craque");

        awardResults.push({
          awardName: award.name,
          winnerName,
          winnerId,
          winnerAvatarUrl,
          voteCount: winnerVoteCount,
          isAutomatic: !award.is_voting_based,
          givesPoints: isCraque,
        });
      }

      dispatch({
        type: "fetchSuccess",
        payload: {
          teamAName: matchRes.data.team_a_name ?? "Time A",
          teamBName: matchRes.data.team_b_name ?? "Time B",
          teamAScore: matchRes.data.team_a_score ?? 0,
          teamBScore: matchRes.data.team_b_score ?? 0,
          results: awardResults,
        },
      });
    }

    void fetchResults();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <MaterialIcon name="pending" className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="font-mono text-label-sm text-on-surface-variant">Carregando resultados...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return <MatchErrorState message={error} />;
  }

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container">
          <div className="flex items-center gap-2">
            <MaterialIcon name="emoji_events" className="w-5 h-5 text-primary" />
            <h2 className="text-headline-md font-display font-black tracking-tighter text-primary uppercase">Resultados</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
          <VoteResult
            teamAName={teamAName}
            teamBName={teamBName}
            teamAScore={teamAScore}
            teamBScore={teamBScore}
            results={results}
          />

          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate("/matches")}
              className="w-full py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
            >
              Voltar para Partidas
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
