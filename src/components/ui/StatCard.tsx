interface StatCardProps {
  label: string
  value: string
  colorClass: string
  hoverBgClass: string
  hoverTextClass: string
}

export function StatCard({ label, value, colorClass, hoverBgClass, hoverTextClass }: Readonly<StatCardProps>) {
  return (
    <div
      className={`bg-surface-container-high rounded-xl border border-outline-variant p-6 flex flex-col items-center justify-center group hover:${hoverBgClass} transition-colors duration-300`}
    >
      <span className={`text-on-surface-variant group-hover:${hoverTextClass} uppercase font-mono text-label-sm mb-2`}>{label}</span>
      <span className={`display-lg ${colorClass} group-hover:text-white`}>{value}</span>
    </div>
  )
}
