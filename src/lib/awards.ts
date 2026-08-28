export const AWARD_BADGES = [
  { name: 'Goleador', icon: 'sports_soccer', chip: 'bg-primary-container text-on-primary-container', className: 'bg-linear-to-br from-violet-200 via-violet-300 to-violet-500 text-violet-950' },
  { name: 'Garçom', icon: 'send', chip: 'bg-secondary-container text-on-secondary-container', className: 'bg-linear-to-br from-purple-200 via-purple-300 to-purple-500 text-purple-950' },
  { name: 'Craque da Partida', icon: 'verified', chip: 'bg-tertiary-container text-on-tertiary-container', className: 'bg-linear-to-br from-yellow-200 via-amber-300 to-amber-500 text-amber-950' },
  { name: 'Muralha', icon: 'shield', chip: 'bg-[#3b82f6]/15 text-[#3b82f6]', className: 'bg-linear-to-br from-blue-200 via-blue-300 to-blue-500 text-blue-950' },
  { name: 'Motorzinho', icon: 'bolt', chip: 'bg-[#10b981]/15 text-[#10b981]', className: 'bg-linear-to-br from-emerald-200 via-emerald-300 to-emerald-500 text-emerald-950' },
  { name: 'Perninha', icon: 'thumb_down', chip: 'bg-[#ef4444]/15 text-[#ef4444]', className: 'bg-linear-to-br from-red-200 via-red-300 to-red-500 text-red-950' },
  { name: 'Frango', icon: 'egg', chip: 'bg-[#f97316]/15 text-[#f97316]', className: 'bg-linear-to-br from-orange-200 via-orange-300 to-orange-500 text-orange-950' },
  { name: 'Cansado', icon: 'turtle', chip: 'bg-[#a3a3a3]/15 text-[#a3a3a3]', className: 'bg-linear-to-br from-gray-200 via-gray-300 to-gray-500 text-gray-950' },
  { name: 'Professor', icon: 'brain-circuit', chip: 'bg-[#854d0e]/15 text-[#ca8a04]', className: 'bg-linear-to-br from-yellow-200 via-yellow-300 to-yellow-500 text-yellow-950' },
  { name: 'Fominha', icon: 'utensils', chip: 'bg-[#dc2626]/15 text-[#dc2626]', className: 'bg-linear-to-br from-red-200 via-red-300 to-red-500 text-red-950' },
  { name: 'Inimigo da Bola', icon: 'circle-star', chip: 'bg-[#dc2626]/15 text-[#dc2626]', className: 'bg-linear-to-br from-red-200 via-red-300 to-red-500 text-red-950', adminOnly: true },
] as const

export type AwardBadge = (typeof AWARD_BADGES)[number]

export function getAwardMeta(name: string): { icon: string; chip: string; title: string; className: string } {
  const lower = name.toLowerCase()
  const found = AWARD_BADGES.find((b) => lower.includes(b.name.toLowerCase()))
  if (found) return { icon: found.icon, chip: found.chip, title: found.name, className: found.className }
  return { icon: 'star', chip: 'bg-surface-variant text-on-surface', title: name, className: 'bg-surface-variant text-on-surface' }
}
