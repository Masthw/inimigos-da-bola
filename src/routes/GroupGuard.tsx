import { Navigate, Outlet } from "react-router-dom";
import { useActiveGroup } from "../hooks/useActiveGroup";

export function GroupGuard() {
  const { activeGroup, loading } = useActiveGroup();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-on-surface label-lg">Carregando...</p>
      </div>
    );
  }

  if (!activeGroup) {
    return <Navigate to="/grupo" replace />;
  }

  return <Outlet />;
}
