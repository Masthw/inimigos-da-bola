import { useState } from "react";
import { Link } from "react-router-dom";
import { MaterialIcon } from "./MaterialIcon";
import { useNextMatch, type NextMatchData } from "../../hooks/useNextMatch";
import { useIsAdmin } from "../../hooks/useIsAdmin";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabaseClient";
import { ATMOSPHERE_PHOTOS, getCourtPhotos } from "../../lib/courts";
import type { Database } from "../../lib/database.types";

type ConfirmStatus = "idle" | "confirming" | "confirmed" | "error";
type MatchPlayerInsert = Database["public"]["Tables"]["match_players"]["Insert"];

interface MatchActionsProps {
  status: ConfirmStatus;
  loading: boolean;
  hasMatch: boolean;
  isAdmin: boolean;
  onConfirm: () => void;
  onRetry: () => void;
}

function MatchActions({ status, loading, hasMatch, isAdmin, onConfirm, onRetry }: Readonly<MatchActionsProps>) {
  if (status === "confirmed") {
    return (
      <button
        type="button"
        disabled
        className="w-full md:w-auto bg-green-800 text-white px-10 py-4 font-mono text-label-bold rounded-none transition-transform flex items-center justify-center gap-3"
      >
        <MaterialIcon name="verified" className="w-5 h-5 text-white" />
        PRESENÇA CONFIRMADA!
      </button>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="w-full md:w-auto bg-error-container text-on-error-container px-10 py-4 font-mono text-label-bold rounded-none transition-transform flex items-center justify-center gap-3"
      >
        <MaterialIcon name="error" className="w-5 h-5" />
        TENTAR NOVAMENTE
      </button>
    );
  }

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="w-full md:w-auto bg-surface-variant text-on-surface-variant px-10 py-4 font-mono text-label-bold rounded-none flex items-center justify-center gap-3 cursor-not-allowed"
      >
        <MaterialIcon name="pending" className="w-5 h-5" />
        CARREGANDO...
      </button>
    );
  }

  if (!hasMatch) {
    if (!isAdmin) return null;

    return (
      <Link
        to="/matches/new"
        className="inline-flex w-full md:w-auto bg-primary text-on-primary px-10 py-4 font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform items-center justify-center gap-3"
      >
        <MaterialIcon name="add_circle" className="w-5 h-5" />
        Novo Jogo
      </Link>
    );
  }

  const confirming = status === "confirming";

  return (
    <button
      type="button"
      onClick={onConfirm}
      className="w-full md:w-auto bg-primary-container text-primary px-10 py-4 font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3"
    >
      <MaterialIcon name={confirming ? "pending" : "check_circle"} className="w-5 h-5" />
      {confirming ? "CONFIRMANDO..." : "EU VOU!"}
    </button>
  );
}

function getCardMeta(loading: boolean, match: NextMatchData | null): { title: string; subtitle: string } {
  if (loading) {
    return { title: "Carregando...", subtitle: "Buscando o próximo jogo" };
  }
  if (match) {
    return { title: match.title, subtitle: "Próxima Pelada" };
  }
  return { title: "Nenhuma partida marcada", subtitle: "Ainda não há jogo agendado" };
}

function getImageSrc(match: NextMatchData | null, photoIndex: number): string | null {
  const pool = match ? getCourtPhotos(match.sportName, match.hour) : [...ATMOSPHERE_PHOTOS];
  return pool.length > 0 ? pool[photoIndex % pool.length] : null;
}

function resolveConfirmStatus(busy: boolean, hasError: boolean, isConfirmed: boolean): ConfirmStatus {
  if (busy) return "confirming";
  if (hasError) return "error";
  if (isConfirmed) return "confirmed";
  return "idle";
}

export function NextMatch() {
  const { match, loading } = useNextMatch();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [busy, setBusy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [photoIndex] = useState(() => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % Math.max(ATMOSPHERE_PHOTOS.length, 1);
  });

  const imageSrc = getImageSrc(match, photoIndex);
  const { title, subtitle } = getCardMeta(loading, match);
  const isConfirmed = match?.myStatus === "confirmed";

  const status: ConfirmStatus = resolveConfirmStatus(busy, hasError, isConfirmed);

  async function handleConfirm() {
    if (!match || !user || busy) return;

    setBusy(true);
    setHasError(false);

    const { data: existing } = await supabase.from("match_players").select("id").eq("match_id", match.id).eq("user_id", user.id).maybeSingle();

    const insertPayload: MatchPlayerInsert = {
      match_id: match.id,
      user_id: user.id,
      status: "confirmed",
      team: "A",
    };

    const result = existing
      ? await supabase.from("match_players").update({ status: "confirmed" }).eq("id", existing.id)
      : await supabase.from("match_players").insert(insertPayload);

    setBusy(false);

    if (result.error) {
      console.error("Erro ao confirmar presença:", result.error);
      setHasError(true);
    }
  }

  return (
    <section className="md:col-span-8 group md:h-120">
      <div className="relative overflow-hidden bg-surface-container-high rounded-xl border border-outline-variant h-full md:h-full flex flex-col md:flex-row transition-colors hover:border-primary/50">
        <div className="relative w-full md:w-1/2 h-56 md:h-full shrink-0">
          {imageSrc && <img key={imageSrc} className="absolute inset-0 w-full h-full object-cover photo-fade" src={imageSrc} alt="Quadra" />}
          <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-r from-surface-container-high via-transparent to-transparent" />
        </div>

        <div className="p-stack-lg flex flex-col justify-between flex-1 relative z-10 overflow-y-auto">
          <div>
            <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container font-mono text-label-sm mb-4 uppercase tracking-widest">
              {subtitle}
            </span>
            <h3 className="text-headline-md font-display text-on-surface mb-stack-sm">{title}</h3>

            {loading && (
              <div className="space-y-3 mt-4">
                <div className="h-5 w-2/3 bg-surface-variant animate-pulse rounded" />
                <div className="h-5 w-1/3 bg-surface-variant animate-pulse rounded" />
              </div>
            )}

            {!loading && match && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <MaterialIcon name="calendar_today" className="w-5 h-5 text-primary" />
                  <span className="font-body">{match.date}</span>
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <MaterialIcon name="schedule" className="w-5 h-5 text-primary" />
                  <span className="font-body">{match.time}</span>
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <MaterialIcon name="location_on" className="w-5 h-5 text-primary" />
                  <span className="font-body">{match.location}</span>
                </div>
              </div>
            )}

            {!loading && !match && (
              <p className="mt-4 text-on-surface-variant font-body max-w-sm">
                Nenhuma pelada agendada ainda. Assim que tiver um jogo marcado, ele aparece aqui.
              </p>
            )}
          </div>

          <div className="mt-stack-lg">
            <MatchActions
              status={status}
              loading={loading}
              hasMatch={Boolean(match)}
              isAdmin={isAdmin}
              onConfirm={handleConfirm}
              onRetry={() => setHasError(false)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
