import { MaterialIcon } from './MaterialIcon'
import { AVATARS } from '../data/mockData'

export function MobileTopBar() {
  return (
    <header className="md:hidden flex justify-between items-center px-4 w-full h-16 z-50 bg-surface border-b border-outline-variant sticky top-0">
      <h1 className="text-headline-md font-display font-black tracking-tighter text-primary">STRIKER HQ</h1>
      <div className="flex items-center gap-4">
        <MaterialIcon name="notifications" className="text-on-surface-variant" />
        <div className="w-8 h-8 rounded-full overflow-hidden border border-primary">
          <img className="w-full h-full object-cover" src={AVATARS.mobile} alt="Avatar mobile" />
        </div>
      </div>
    </header>
  )
}
