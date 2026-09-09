import { MaterialIcon } from "../ui/MaterialIcon";
import { Modal } from "../ui/Modal";

interface LeaveGroupModalProps {
  open: boolean;
  groupName: string;
  isLeaving: boolean;
  error: string | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function LeaveGroupModal({
  open,
  groupName,
  isLeaving,
  error,
  onConfirm,
  onClose,
}: Readonly<LeaveGroupModalProps>) {
  return (
    <Modal
      open={open}
      onClose={() => !isLeaving && onClose()}
      title="Sair do Grupo"
      icon="logout"
      actions={
        <>
          <button
            type="button"
            disabled={isLeaving}
            onClick={onClose}
            className="px-4 py-2 font-mono text-label-sm border border-outline-variant hover:bg-surface-variant transition-colors disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            type="button"
            disabled={isLeaving}
            onClick={onConfirm}
            className="px-4 py-2 bg-error text-on-error font-mono text-label-sm brutal-shadow hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLeaving ? (
              <>
                <MaterialIcon name="pending" className="w-4 h-4 animate-spin" />
                SAINDO...
              </>
            ) : (
              "SAIR"
            )}
          </button>
        </>
      }
    >
      <p className="text-body-md text-on-surface-variant">
        Tem certeza que deseja sair do grupo{" "}
        <strong className="text-on-surface font-semibold">{groupName}</strong>?
        Você perderá o acesso às partidas, rankings e conquistas dele.
      </p>
      {error && <p className="text-error font-body text-sm mt-3">{error}</p>}
    </Modal>
  );
}