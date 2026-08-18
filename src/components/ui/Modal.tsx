import { useEffect, type ReactNode } from 'react'
import { MaterialIcon } from './MaterialIcon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: string
  children: ReactNode
  actions?: ReactNode
}

export function Modal({ open, onClose, title, icon, children, actions }: Readonly<ModalProps>) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-container-high border border-outline-variant brutal-shadow rounded-xl w-full max-w-md animate-in">
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2.5">
            {icon && <MaterialIcon name={icon} className="w-5 h-5 text-primary" />}
            <h3 className="text-headline-md font-display font-bold text-on-surface uppercase">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
          >
            <MaterialIcon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>

        {actions && (
          <div className="px-5 pb-5 flex flex-col sm:flex-row gap-3 justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
