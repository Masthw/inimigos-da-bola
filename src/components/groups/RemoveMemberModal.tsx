import { MaterialIcon } from "../ui/MaterialIcon";
import { Modal } from "../ui/Modal";
import { formatShortName } from "../../lib/profile";
import type { Member } from "./types";

interface RemoveMemberModalProps {
  member: Member | null;
  groupName: string;
  isRemoving: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function RemoveMemberModal({
  member,
  groupName,
  isRemoving,
  onConfirm,
  onClose,
}: Readonly<RemoveMemberModalProps>) {
  return (
    <Modal
      open={!!member}
      onClose={() => !isRemoving && onClose()}
      title="Remover Membro"
      icon="delete"
      actions={
        <>
          <button
            type="button"
            disabled={isRemoving}
            onClick={onClose}
            className="px-4 py-2 font-mono text-label-sm border border-outline-variant hover:bg-surface-variant transition-colors disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            type="button"
            disabled={isRemoving}
            onClick={onConfirm}
            className="px-4 py-2 bg-error text-on-error font-mono text-label-sm brutal-shadow hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRemoving ? (
              <>
                <MaterialIcon name="pending" className="w-4 h-4 animate-spin" />
                REMOVENDO...
              </>
            ) : (
              "REMOVER"
            )}
          </button>
        </>
      }
    >
      <p className="text-body-md text-on-surface-variant">
        Tem certeza que deseja remover{" "}
        <strong className="text-on-surface font-semibold">
          {member?.users?.name ? formatShortName(member.users.name) : "este membro"}
        </strong>{" "}
        do grupo <strong className="text-on-surface font-semibold">{groupName}</strong>?
      </p>
    </Modal>
  );
}
