import { Avatar } from "../ui/Avatar";
import type { PendingMember } from "./types";

interface PendingRequestsListProps {
  pending: PendingMember[];
  busyUserId: string | null;
  onApprove: (userId: string) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
}

export function PendingRequestsList({
  pending,
  busyUserId,
  onApprove,
  onReject,
}: Readonly<PendingRequestsListProps>) {
  return (
    <section className="mb-8">
      <h2 className="text-title-md font-mono text-on-surface mb-3">
        Solicitações pendentes ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Nenhuma solicitação no momento.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((p) => {
            const isBusy = busyUserId === p.user_id;

            return (
              <div
                key={p.user_id}
                className="flex items-center justify-between p-3 bg-surface-container-high border border-outline-variant rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={p.users?.avatar_url ?? null}
                    alt={p.users?.name ?? "Membro pendente"}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-mono text-label-sm text-on-surface">
                    {p.users?.name ?? p.user_id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onApprove(p.user_id)}
                    className="px-3 py-1 bg-primary-container text-on-primary-container font-mono text-label-sm hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isBusy ? "..." : "ACEITAR"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onReject(p.user_id)}
                    className="px-3 py-1 bg-error-container text-on-error-container font-mono text-label-sm hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    RECUSAR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
