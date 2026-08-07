import { MaterialIcon } from './MaterialIcon'

interface AvatarProps {
  src: string | null
  alt: string
  className?: string
}

export function Avatar({ src, alt, className = '' }: Readonly<AvatarProps>) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-surface-variant text-on-surface-variant ${className}`}>
        <MaterialIcon name="person" className="w-1/2 h-1/2" />
      </div>
    )
  }

  return (
    <div className={`overflow-hidden bg-surface-variant ${className}`}>
      <img className="w-full h-full object-cover" src={src} alt={alt} referrerPolicy="no-referrer" />
    </div>
  )
}
