import { MaterialIcon } from './MaterialIcon'

interface MobileTopBarProps {
  onMenuClick: () => void
}

export function MobileTopBar({ onMenuClick }: Readonly<MobileTopBarProps>) {
  return (
    <header className="md:hidden flex items-center justify-between px-4 w-full h-16 z-40 bg-surface border-b border-outline-variant sticky top-0">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors"
      >
        <MaterialIcon name="menu" className="w-6 h-6" />
      </button>
      <h1 className="text-headline-md font-display font-black tracking-tighter text-primary">INIMIGOS DA BOLA</h1>
    </header>
  )
}
