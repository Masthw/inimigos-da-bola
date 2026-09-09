import { Avatar } from "../ui/Avatar";
import { MaterialIcon } from "../ui/MaterialIcon";
import { formatShortName } from "../../lib/profile";
import type { Member } from "./types";

interface GroupMembersListProps {
  members: Member[];
  currentUserId?: string;
  busyUserId: string | null;
  onSetRole: (userId: string, role: "admin" | "member") => Promise<void>;
  onRemove: (member: Member) => void;
}

export function GroupMembersList({
  members,
  currentUserId,
  busyUserId,
  onSetRole,
  onRemove,
}: Readonly<GroupMembersListProps>) {
  return (
    <section>
      <h2 className="text-title-md font-mono text-on-surface mb-3">Membros ({members.length})</h2>
      <div className="space-y-2">
        {members.map((m) => {
          const isCurrentUser = m.user_id === currentUserId;
          const isBusy = busyUserId === m.user_id;
          const displayName = m.users?.name ? formatShortName(m.users.name) : m.user_id;

          return (
            <div
              key={m.user_id}
              className="flex items-center justify-between p-3 bg-surface-container-high border border-outline-variant rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={m.users?.avatar_url ?? null}
                  alt={displayName}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-label-sm text-on-surface">
                    {displayName}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-variant text-on-surface-variant">
                      VOCÊ
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === "admin" ? (
                  <button
                    type="button"
                    disabled={isBusy || isCurrentUser}
                    onClick={() => onSetRole(m.user_id, "member")}
                    className="font-mono text-label-sm px-2 py-0.5 rounded bg-primary-container text-on-primary-container hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    title={isCurrentUser ? "Você é o admin" : "Rebaixar para membro"}
                  >
                    ADMIN
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSetRole(m.user_id, "admin")}
                    className="font-mono text-label-sm px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant hover:scale-105 transition-transform disabled:opacity-50"
                    title="Promover a admin do grupo"
                  >
                    MEMBRO
                  </button>
                )}

                {!isCurrentUser && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onRemove(m)}
                    className="p-1.5 rounded text-error hover:bg-error-container hover:text-on-error-container transition-colors disabled:opacity-50"
                    title="Remover do grupo"
                  >
                    <MaterialIcon name="delete" className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
