import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { Avatar } from "./Avatar";
import { NAV_ITEMS } from "../../navlinks/links";
import { useAuth } from "../../hooks/useAuth";
import { useActiveGroup } from "../../hooks/useActiveGroup";
import { getAvatarUrl, getDisplayName, getFirstName } from "../../lib/profile";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Readonly<SidebarProps>) {
  const { logout, user } = useAuth();
  const { groups, activeGroup, activeGroupId, setActiveGroup, isAdmin } = useActiveGroup();
  const { pathname } = useLocation();
  const name = getFirstName(getDisplayName(user));
  const avatarUrl = getAvatarUrl(user);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const navItems = [...NAV_ITEMS, { icon: "person", label: "Perfil", href: `/profile/${user?.id ?? ""}` }];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const content = (
    <>
      <div className="flex items-center justify-between px-6 py-stack-lg">
        <h1 className="text-headline-lg text-xl font-display font-black text-primary tracking-tighter">INIMIGOS DA BOLA</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="md:hidden p-2 -mr-2 text-on-surface-variant hover:text-primary transition-colors"
        >
          <MaterialIcon name="close" className="w-5 h-5" />
        </button>
      </div>

      <Link
        to={`/profile/${user?.id ?? ""}`}
        onClick={onClose}
        className="flex items-center gap-3 px-6 py-4 mb-stack-lg hover:bg-surface-variant transition-colors rounded-lg mx-2"
      >
        <Avatar src={avatarUrl} alt={name} className="w-12 h-12 rounded-full" />
        <div className="min-w-0">
          <p className="text-on-surface font-mono text-label-bold truncate">{name}</p>
        </div>
      </Link>

      {activeGroup && (
        <div className="mx-2 mb-2">
          <div className="flex items-center gap-2 px-3 py-2 text-on-surface-variant">
            <MaterialIcon name="groups" className="w-4 h-4 shrink-0" />
            <span className="font-mono text-label-sm truncate">{activeGroup.name}</span>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-1">
        {groups.length > 1 && (
          <div className="relative px-2 pb-2">
            <button
              type="button"
              onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors"
            >
              <span className="font-mono text-label-sm text-on-surface truncate">{activeGroup?.name ?? "Sem grupo"}</span>
              <MaterialIcon name={groupDropdownOpen ? "arrow_drop_up" : "arrow_drop_down"} className="w-5 h-5 text-on-surface-variant shrink-0" />
            </button>
            {groupDropdownOpen && (
              <div className="absolute left-2 right-2 mt-1 bg-surface-container-high border border-outline-variant rounded-lg shadow-lg z-10 overflow-hidden">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setActiveGroup(group.id);
                      setGroupDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 font-mono text-label-sm transition-colors ${
                      group.id === activeGroupId ? "bg-primary-container text-on-primary-container" : "text-on-surface hover:bg-surface-variant"
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {navItems.map((item) => (
          <Link
            key={item.icon}
            to={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg mx-2 transition-all ${
              isActive(item.href)
                ? "bg-primary-container text-on-primary-container translate-x-1"
                : "text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            <MaterialIcon name={item.icon} className="w-5 h-5" />
            <span className="font-mono text-label-bold">{item.label}</span>
          </Link>
        ))}
        {isAdmin && (
          <Link
            to="/group/management"
            onClick={onClose}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg mx-2 transition-all ${
              isActive("/group/management")
                ? "bg-primary-container text-on-primary-container translate-x-1"
                : "text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            <MaterialIcon name="group" className="w-5 h-5" />
            <span className="font-mono text-label-bold">Grupo</span>
          </Link>
        )}
      </div>

      <div className="px-4 mt-auto space-y-1">
        {isAdmin && (
          <Link
            to="/matches/new"
            onClick={onClose}
            className="w-full bg-primary text-on-primary font-mono text-label-bold py-4 brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-2"
          >
            <MaterialIcon name="add_circle" className="w-5 h-5" />
            Novo Jogo
          </Link>
        )}
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-5 font-mono text-label-bold text-on-surface-variant hover:text-error transition-colors"
        >
          <MaterialIcon name="logout" className="w-5 h-5" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-surface-container border-r border-outline-variant z-50">
        {content}
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
          <nav className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-surface-container border-r border-outline-variant flex flex-col overflow-y-auto">
            {content}
          </nav>
        </div>
      )}
    </>
  );
}
