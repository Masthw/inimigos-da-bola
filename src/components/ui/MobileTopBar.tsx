import { MaterialIcon } from './MaterialIcon'
import { Avatar } from './Avatar'
import { useAuth } from '../../hooks/useAuth'
import { getAvatarUrl, getDisplayName } from '../../lib/profile'

export function MobileTopBar() {
  const { logout, user } = useAuth()
  const name = getDisplayName(user)
  const avatarUrl = getAvatarUrl(user)

  return (
    <header className="md:hidden flex justify-between items-center px-4 w-full h-16 z-50 bg-surface border-b border-outline-variant sticky top-0">
      <h1 className="text-headline-md font-display font-black tracking-tighter text-primary">INIMIGOS DA BOLA</h1>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={logout}
          aria-label="Sair"
          className="p-1.5 mr-1 text-on-surface-variant hover:text-error transition-colors"
        >
          <MaterialIcon name="logout" className="w-5 h-5" />
        </button>
        <Avatar src={avatarUrl} alt={name} className="w-8 h-8 rounded-full" />
      </div>
    </header>
  )
}
