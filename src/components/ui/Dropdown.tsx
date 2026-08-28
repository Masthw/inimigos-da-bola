import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from './MaterialIcon'

export interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  placeholder?: string
  icon?: string
}

export function Dropdown({ value, options, onChange, placeholder = 'Selecione', icon }: Readonly<DropdownProps>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 w-full px-4 py-3 bg-surface-container-high border border-outline-variant focus:border-primary transition-colors text-left"
      >
        {icon && <MaterialIcon name={icon} className="w-5 h-5 text-on-surface-variant" />}
        <span
          className={`flex-1 font-body truncate ${
            selected ? 'text-on-surface' : 'text-on-surface-variant/60'
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <MaterialIcon
          name={open ? 'expand_less' : 'expand_more'}
          className={`w-5 h-5 transition-colors ${open ? 'text-primary' : 'text-on-surface-variant'}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-surface-container-high border border-outline-variant shadow-lg custom-scrollbar">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left font-body transition-colors hover:bg-primary-container/20 ${
                option.value === value
                  ? 'bg-primary-container/10 text-primary'
                  : 'text-on-surface'
              }`}
            >
              <span className="flex-1 truncate">{option.label}</span>
              {option.value === value && <MaterialIcon name="check_circle" className="w-4 h-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
