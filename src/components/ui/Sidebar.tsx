import { Link } from 'react-router-dom'
import { MaterialIcon } from './MaterialIcon'
import { Avatar } from './Avatar'
import { NAV_ITEMS } from '../../navlinks/links'
import { useAuth } from '../../hooks/useAuth'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { getAvatarUrl, getDisplayName, getFirstName } from '../../lib/profile'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Readonly<SidebarProps>) {
  const { logout, user } = useAuth()
  const { isAdmin } = useIsAdmin()
  const name = getFirstName(getDisplayName(user))
  const avatarUrl = getAvatarUrl(user)

  const content = (
    <>
      <div className="flex items-center justify-between px-6 py-stack-lg">
        <h1 className="text-headline-lg font-display font-black text-primary tracking-tighter">INIMIGOS DA BOLA</h1>
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
        to={`/profile/${user?.id ?? ''}`}
        onClick={onClose}
        className="flex items-center gap-3 px-6 py-4 mb-stack-lg hover:bg-surface-variant transition-colors rounded-lg mx-2"
      >
        <Avatar src={avatarUrl} alt={name} className="w-12 h-12 rounded-full" />
        <div className="min-w-0">
          <p className="text-on-surface font-mono text-label-bold truncate">{name}</p>
        </div>
      </Link>

      <div className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.icon}
            to={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg mx-2 transition-all ${
              item.active
                ? 'bg-primary-container text-on-primary-container translate-x-1'
                : 'text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <MaterialIcon name={item.icon} className="w-5 h-5" />
            <span className="font-mono text-label-bold">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="px-4 mt-auto space-y-1">
        {isAdmin && (
          <Link
            to="/matches"
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
          className="w-full flex items-center justify-center gap-2 py-3 font-mono text-label-bold text-on-surface-variant hover:text-error transition-colors"
        >
          <MaterialIcon name="logout" className="w-5 h-5" />
          Sair
        </button>
      </div>
    </>
  )

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
  )
}
