import { useLayoutEffect, useState, useCallback, type ReactNode } from "react";
import { MaterialIcon } from "../../components/ui/MaterialIcon";
import { useFavoritePositions, type Position } from "../../hooks/useFavoritePositions";

interface FavoritePositionsModalProps {
  /** Controla a visibilidade do modal (renderiza nada quando false). */
  open: boolean;
  onClose: () => void;
}

type Tab = "futsal" | "society";

const CLOSE_ANIMATION_MS = 180;

function LoadingSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 bg-surface-variant animate-pulse rounded-xl w-full" />
      ))}
    </div>
  );
}

export function FavoritePositionsModal({ open, onClose }: Readonly<FavoritePositionsModalProps>) {
  const [activeTab, setActiveTab] = useState<Tab>("futsal");
  const [isClosing, setIsClosing] = useState(false);

  const { loading, saving, error, toggleFavorite, getPositionsByGameType, isFavorite } = useFavoritePositions();

  const futsalPositions = getPositionsByGameType("futsal");
  const societyPositions = getPositionsByGameType("society");
  const currentPositions = activeTab === "futsal" ? futsalPositions : societyPositions;

  const selectedPosition = currentPositions.find((p) => isFavorite(p.id)) ?? null;

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, CLOSE_ANIMATION_MS);
  }, [onClose]);

  useLayoutEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  const handleSelect = async (position: Position) => {
    if (saving) return;

    if (isFavorite(position.id)) {
      await toggleFavorite(position.id, true);
      return;
    }

    const currentSelected = currentPositions.find((p) => isFavorite(p.id));
    if (currentSelected) {
      await toggleFavorite(currentSelected.id, true);
    }
    await toggleFavorite(position.id, true);
  };

  const tabClassName = (tab: Tab) =>
    `flex-1 py-2 rounded-lg font-label-bold text-label-bold transition-all ${
      activeTab === tab ? "bg-primary-container text-on-primary-container shadow-sm" : "text-on-surface-variant hover:bg-surface-variant/50"
    }`;

  let body: ReactNode;
  if (loading) {
    body = <LoadingSkeleton />;
  } else if (error) {
    body = (
      <div className="flex-1 overflow-y-auto p-4">
        <p className="font-mono text-label-sm text-error text-center py-6">{error}</p>
      </div>
    );
  } else if (currentPositions.length === 0) {
    body = (
      <div className="flex-1 overflow-y-auto p-4">
        <p className="font-mono text-label-sm text-on-surface-variant text-center py-6">Nenhuma posição encontrada para esta modalidade.</p>
      </div>
    );
  } else {
    body = (
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {currentPositions.map((position) => {
          const isSelected = selectedPosition?.id === position.id;
          return (
            <button
              key={position.id}
              type="button"
              disabled={saving}
              onClick={() => handleSelect(position)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                isSelected ? "bg-primary/20 border border-primary/50" : "bg-surface-variant/50 border border-transparent active:bg-surface-variant"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-label-bold shrink-0 ${
                  isSelected ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {position.code}
              </div>
              <div className="flex-1 text-left">
                <p className="font-mono text-label-sm text-on-surface">{position.name}</p>
              </div>
              {isSelected && <MaterialIcon name="check_circle" className="w-5 h-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={handleClose}
        className={`absolute inset-0 cursor-default transition-colors duration-200 ${isClosing ? "bg-black/0" : "bg-black/60"}`}
      />

      <dialog
        open={open}
        aria-label="Posições Favoritas"
        className={`relative w-full bg-surface-container-high rounded-t-2xl max-h-[85vh] flex flex-col transition-transform duration-200 ease-out m-0 max-w-none p-0 border-none ${
          isClosing ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="p-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MaterialIcon name="sports_soccer" className="w-6 h-6 text-primary" />
              <p className="font-mono text-label-bold text-on-surface uppercase">Posições Favoritas</p>
            </div>
            <button type="button" onClick={handleClose} className="p-2 hover:bg-surface-variant rounded-lg transition-colors">
              <MaterialIcon name="close" className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>

          <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant/30 mt-4">
            <button type="button" onClick={() => setActiveTab("futsal")} className={tabClassName("futsal")}>
              Futsal
            </button>
            <button type="button" onClick={() => setActiveTab("society")} className={tabClassName("society")}>
              Society
            </button>
          </div>
        </div>

        {body}

        <div className="p-4 border-t border-outline-variant flex gap-3 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={handleClose}
            className="flex-1 py-3 bg-surface-variant text-on-surface font-mono text-label-bold border border-outline-variant active:bg-surface-container-high transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleClose}
            className="flex-1 py-3 bg-primary text-on-primary font-mono text-label-bold active:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
