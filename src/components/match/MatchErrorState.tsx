import { useNavigate } from "react-router-dom";
import { AppShell } from "../ui/AppShell";
import { MaterialIcon } from "../ui/MaterialIcon";

export function MatchErrorState({ message }: Readonly<{ message: string }>) {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
        <div className="text-center">
          <MaterialIcon name="error" className="w-10 h-10 text-error mx-auto mb-4" />
          <p className="font-mono text-label-bold text-on-surface">{message}</p>
          <button
            type="button"
            onClick={() => navigate("/matches")}
            className="mt-4 px-4 py-2 font-mono text-label-sm text-primary hover:bg-surface-variant transition-colors"
          >
            Voltar para partidas
          </button>
        </div>
      </div>
    </AppShell>
  );
}
