import { useState } from 'react'
import { MaterialIcon } from './MaterialIcon'
import { NEXT_MATCH } from '../../data/mockData'

export function NextMatch() {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'confirmed'>('idle')

  function handleConfirm() {
    if (status !== 'idle') return
    setStatus('confirming')
    setTimeout(() => setStatus('confirmed'), 1200)
  }

  return (
    <section className="md:col-span-8 group">
      <div className="relative overflow-hidden bg-surface-container-high rounded-xl border border-outline-variant h-full flex flex-col md:flex-row transition-colors hover:border-primary/50">
        <div className="relative w-full md:w-1/2 h-48 md:h-full min-h-50">
          <img className="w-full h-full object-cover" src={NEXT_MATCH.imageUrl} alt="Quadra de futsal" />
          <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-r from-surface-container-high via-transparent to-transparent" />
        </div>

        <div className="p-stack-lg flex flex-col justify-between flex-1 relative z-10">
          <div>
            <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container font-mono text-label-sm mb-4 uppercase tracking-widest">
              Próxima Pelada
            </span>
            <h3 className="text-headline-md font-display text-on-surface mb-stack-sm">{NEXT_MATCH.title}</h3>
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-3 text-on-surface-variant">
                <MaterialIcon name="calendar_today" className="text-primary" />
                <span className="font-body">{NEXT_MATCH.date}</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant">
                <MaterialIcon name="schedule" className="text-primary" />
                <span className="font-body">{NEXT_MATCH.time}</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant">
                <MaterialIcon name="location_on" className="text-primary" />
                <span className="font-body">{NEXT_MATCH.location}</span>
              </div>
            </div>
          </div>

          <div className="mt-stack-lg">
            {status === 'confirmed' ? (
              <button
                type="button"
                disabled
                className="w-full md:w-auto bg-green-800 text-white px-10 py-4 font-mono text-label-bold rounded-none transition-transform flex items-center justify-center gap-3"
              >
                <MaterialIcon name="verified" fill className="text-white" />
                PRESENÇA CONFIRMADA!
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full md:w-auto bg-primary text-on-primary px-10 py-4 font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3"
              >
                <MaterialIcon name={status === 'confirming' ? 'pending' : 'check_circle'} fill />
                {status === 'confirming' ? 'CONFIRMANDO...' : 'EU VOU!'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
