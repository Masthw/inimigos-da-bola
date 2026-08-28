import { useState, useMemo, useEffect, useCallback } from "react";
import { MaterialIcon } from "../ui/MaterialIcon";
import { Avatar } from "../ui/Avatar";
import { getAwardMeta } from "../../lib/awards";
import type { VotingAward, VotingPlayer } from "../../hooks/useVoting";

interface VoteCardProps {
  award: VotingAward;
  players: VotingPlayer[];
  currentUserId: string;
  votedPlayers: VotingPlayer[];
  hasVoted: boolean;
  onVote: (playerId: string | null) => Promise<boolean>;
  disabled?: boolean;
}

export function VoteCard({ award, players, currentUserId, votedPlayers, hasVoted, onVote, disabled }: Readonly<VoteCardProps>) {
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const awardMeta = getAwardMeta(award.name);
  const icon = awardMeta.icon;
  const isMvp = award.name.toLowerCase().includes("craque");
  const eligiblePlayers = players.filter((p) => p.userId !== currentUserId);

  const allVoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    players.forEach((p) => {
      counts[p.userId] = 0;
    });
    if (award.voteCounts) {
      Object.entries(award.voteCounts).forEach(([userId, count]) => {
        counts[userId] = count;
      });
    }
    return counts;
  }, [players, award.voteCounts]);

  const sortedPlayers = useMemo(() => {
    return eligiblePlayers.toSorted((a, b) => (allVoteCounts[b.userId] || 0) - (allVoteCounts[a.userId] || 0));
  }, [eligiblePlayers, allVoteCounts]);

  const maxVotes = Math.max(...Object.values(allVoteCounts), 1);

  const togglePlayer = (playerId: string) => {
    if (isMvp) {
      setSelectedPlayerIds([playerId]);
    } else {
      setSelectedPlayerIds((prev) => (prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]));
    }
  };

  const selectedIdsSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      if (isMvp) {
        const playerId = selectedPlayerIds[0] || null;
        await onVote(playerId);
      } else {
        const currentIds = new Set(votedPlayers.map((vp) => vp.userId));
        const selectedIds = new Set(selectedPlayerIds);
        const toAdd = selectedPlayerIds.filter((id) => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter((id) => !selectedIds.has(id));

        await Promise.all([...toAdd.map((playerId) => onVote(playerId)), ...toRemove.map((playerId) => onVote(playerId))]);
      }
    } finally {
      setSubmitting(false);
    }
    handleClose();
  };

  const openModal = () => {
    setSelectedPlayerIds(votedPlayers.map((vp) => vp.userId));
    setIsClosing(false);
    setShowModal(true);
  };

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setSelectedPlayerIds([]);
    }, 180);
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [showModal]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={openModal}
        className={`w-full text-left bg-surface-container rounded-2xl p-4 border transition-colors active:scale-[0.98] ${
          hasVoted ? "border-primary/40 bg-primary/5" : "border-outline-variant"
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${awardMeta.chip}`}>
            <MaterialIcon name={icon} className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-label-bold text-on-surface uppercase">{award.name}</p>
          </div>
          {hasVoted ? (
            <MaterialIcon name="check_circle" className="w-5 h-5 text-primary shrink-0" />
          ) : (
            <span className="font-mono text-[10px] text-on-surface-variant shrink-0">Toque para votar</span>
          )}
        </div>

        {hasVoted && votedPlayers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {votedPlayers.map((vp) => (
              <div key={vp.userId} className={`flex items-center gap-1 px-2 py-1 rounded-lg ${awardMeta.chip}`}>
                <Avatar src={null} alt={vp.name} className="w-4 h-4 rounded-full" />
                <span className="font-mono text-[10px]">{vp.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          {sortedPlayers.slice(0, 5).map((player, idx) => {
            const votes = allVoteCounts[player.userId] || 0;
            const pct = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
            const isLeader = idx === 0 && votes > 0;
            return (
              <div key={player.userId} className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-on-surface-variant w-16 truncate flex items-center gap-1">
                  {isLeader && <MaterialIcon name="crown" className="w-3 h-3 text-amber-500 shrink-0" />}
                  {player.name}
                </span>
                <div className="flex-1 h-4 bg-surface-variant/50 rounded overflow-hidden">
                  <div className={`h-full rounded transition-all ${awardMeta.chip.split(" ")[0]}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant w-4 text-right">{votes}</span>
              </div>
            );
          })}
        </div>
      </button>

      {showModal && (
        <div className={`fixed inset-0 z-50 transition-colors duration-200 ${isClosing ? "bg-black/0" : "bg-black/60"}`}>
          <button
            type="button"
            aria-label="Fechar modal"
            className="absolute inset-0 w-full h-full border-none outline-none bg-transparent cursor-default"
            onClick={handleClose}
          />

          <div
            className={`absolute bottom-0 left-0 right-0 bg-surface-container-high rounded-t-2xl max-h-[85vh] flex flex-col transition-transform duration-200 ease-out pointer-events-auto ${
              isClosing ? "translate-y-full" : "translate-y-0"
            }`}
          >
            <div className="p-4 border-b border-outline-variant shrink-0">
              <div className="flex items-center gap-3">
                <MaterialIcon name={icon} className={`w-6 h-6 ${awardMeta.chip.split(" ").find((c) => c.startsWith("text-")) ?? "text-primary"}`} />
                <p className="font-mono text-label-bold text-on-surface uppercase">{award.name}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {eligiblePlayers.map((player) => {
                const isSelected = selectedIdsSet.has(player.userId);
                return (
                  <button
                    key={player.userId}
                    type="button"
                    disabled={submitting}
                    onClick={() => togglePlayer(player.userId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-primary/20 border border-primary/50"
                        : "bg-surface-variant/50 border border-transparent active:bg-surface-variant"
                    }`}
                  >
                    <Avatar src={null} alt={player.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1 text-left">
                      <p className="font-mono text-label-sm text-on-surface">{player.name}</p>
                      {player.team && (
                        <p className="font-mono text-[10px] text-on-surface-variant uppercase">{player.team === "A" ? "Time A" : "Time B"}</p>
                      )}
                    </div>
                    {isSelected && <MaterialIcon name="check_circle" className="w-5 h-5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-outline-variant flex gap-3 shrink-0">
              <button
                type="button"
                disabled={submitting}
                onClick={handleClose}
                className="flex-1 py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting || selectedPlayerIds.length === 0}
                onClick={handleConfirm}
                className="flex-1 py-3 bg-primary text-on-primary font-mono text-label-bold active:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {submitting ? "..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
