import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from './MaterialIcon'

interface TimePickerProps {
  hour: string
  minute: string
  onHourChange: (hour: string) => void
  onMinuteChange: (minute: string) => void
}

const HOURS = Array.from({ length: 18 }, (_, index) => String(index + 6).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export function TimePicker({ hour, minute, onHourChange, onMinuteChange }: Readonly<TimePickerProps>) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'hour' | 'minute'>('hour')
  const rootRef = useRef<HTMLDivElement>(null)

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

  const value = hour && minute ? `${hour}:${minute}` : ''

  const selectHour = (selectedHour: string) => {
    onHourChange(selectedHour)
    setStep('minute')
  }

  const selectMinute = (selectedMinute: string) => {
    onMinuteChange(selectedMinute)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setStep(hour ? 'minute' : 'hour')
          setOpen((prev) => !prev)
        }}
        className="flex items-center gap-3 w-full px-4 py-3 bg-surface-container-high border border-outline-variant focus:border-primary transition-colors text-left"
      >
        <MaterialIcon name="schedule" className="w-5 h-5 text-on-surface-variant" />
        <span className={`flex-1 font-body ${value ? 'text-on-surface' : 'text-on-surface-variant/60'}`}>
          {value || '--:--'}
        </span>
        <MaterialIcon
          name={open ? 'expand_less' : 'expand_more'}
          className={`w-5 h-5 transition-colors ${open ? 'text-primary' : 'text-on-surface-variant'}`}
        />
      </button>

      {open && (
         <div className="absolute z-30 mt-1 w-full min-w-[200px] bg-surface-container-high border border-outline-variant shadow-lg">
          {step === 'hour' && (
            <div className="p-3">
              <p className="font-mono text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">
                Escolha a hora
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {HOURS.map((valueHour) => (
                  <button
                    key={valueHour}
                    type="button"
                    onClick={() => selectHour(valueHour)}
                    className={`py-2 font-mono text-label-bold rounded transition-colors ${
                      valueHour === hour
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-variant text-on-surface hover:bg-primary-container/40'
                    }`}
                  >
                    {valueHour}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'minute' && (
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setStep('hour')}
                  className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <MaterialIcon name="arrow_back" className="w-4 h-4" />
                  <span className="font-mono text-label-sm uppercase tracking-widest">{hour}h</span>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MINUTES.map((valueMinute) => (
                  <button
                    key={valueMinute}
                    type="button"
                    onClick={() => selectMinute(valueMinute)}
                    className={`py-3 font-mono text-label-bold rounded transition-colors ${
                      valueMinute === minute
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-variant text-on-surface hover:bg-primary-container/40'
                    }`}
                  >
                    {valueMinute}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
