import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from './MaterialIcon'

export interface ConquistaBadge {
  icon: string
  title: string
  count: number
  className: string
}

export function ConquistasCarousel({ badges }: Readonly<{ badges: readonly ConquistaBadge[] }>) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const check = () => {
      const viewport = viewportRef.current
      const content = contentRef.current
      if (!viewport || !content) return
      const singleWidth = overflows ? content.scrollWidth / 2 : content.scrollWidth
      setOverflows(singleWidth > viewport.clientWidth)
    }

    check()
    const resizeObserver = new ResizeObserver(check)
    if (viewportRef.current) resizeObserver.observe(viewportRef.current)
    if (contentRef.current) resizeObserver.observe(contentRef.current)
    window.addEventListener('resize', check)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [overflows])

  const pill = (badge: ConquistaBadge) => (
    <div
      key={badge.title}
      title={badge.title}
      className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 shrink-0 mr-3 brutal-shadow ${badge.className}`}
    >
      <MaterialIcon name={badge.icon} className="w-5 h-5" />
      <span className="font-mono text-sm font-black uppercase tracking-wide whitespace-nowrap">{badge.title}</span>
      <span className="font-mono text-sm font-black opacity-80">×{badge.count}</span>
    </div>
  )

  return (
    <div ref={viewportRef} className="group overflow-hidden">
      <div
        ref={contentRef}
        className={overflows ? 'flex w-max animate-marquee' : 'flex'}
        style={overflows ? { animationDuration: `${badges.length * 2.5}s` } : undefined}
      >
        {badges.map(pill)}
        {overflows && badges.map(pill)}
      </div>
    </div>
  )
}
