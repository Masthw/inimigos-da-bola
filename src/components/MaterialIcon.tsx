interface MaterialIconProps {
  name: string
  fill?: boolean
  className?: string
}

export function MaterialIcon({ name, fill = false, className = '' }: Readonly<MaterialIconProps>) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  )
}
