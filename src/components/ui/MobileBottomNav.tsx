import { Link } from 'react-router-dom'
import { MaterialIcon } from './MaterialIcon'
import { BOTTOM_NAV_ITEMS } from '../../data/mockData'

export function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface-container-high border-t border-outline-variant/20 shadow-lg">
      {BOTTOM_NAV_ITEMS.map((item) => (
        <Link
          key={item.icon}
          to="#"
          className={`flex flex-col items-center justify-center transition-transform duration-100 ${
            item.active
              ? 'text-primary-container bg-surface-container-highest rounded-full px-4 py-1 scale-95'
              : 'text-on-surface-variant hover:bg-surface-variant/50'
          }`}
        >
          <MaterialIcon name={item.icon} className="w-5 h-5" />
          <span className="font-mono text-label-sm">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
