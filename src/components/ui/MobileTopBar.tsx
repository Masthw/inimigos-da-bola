import { Link } from "react-router-dom";
import { MaterialIcon } from "./MaterialIcon";
import { Avatar } from "./Avatar";
import { useAuth } from "../../hooks/useAuth";
import { getAvatarUrl, getDisplayName, getFirstName } from "../../lib/profile";

export function MobileTopBar() {
  const { logout, user } = useAuth();
  const name = getFirstName(getDisplayName(user));
  const avatarUrl = getAvatarUrl(user);

  return (
    <header className="md:hidden flex justify-between items-center px-4 w-full h-16 z-50 bg-surface border-b border-outline-variant sticky top-0">
      <h1 className="text-headline-md font-display font-black tracking-tighter text-primary">INIMIGOS DA BOLA</h1>
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to={`/profile/${user?.id ?? ""}`}
          className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-outline-variant bg-surface-container-high active:bg-surface-variant transition-colors min-w-0"
        >
          <Avatar src={avatarUrl} alt={name} className="w-8 h-8 rounded-full shrink-0" />
          <span className="font-mono text-label-bold text-on-surface truncate max-w-24">{name}</span>
        </Link>

        <button type="button" onClick={logout} aria-label="Sair" className="p-2 text-on-surface-variant hover:text-error transition-colors shrink-0">
          <MaterialIcon name="logout" className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
