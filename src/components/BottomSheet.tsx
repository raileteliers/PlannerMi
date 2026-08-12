import { useEffect } from 'react'

/** One of the two things in the app that really floats, so it gets a shadow. */
export function BottomSheet({
  titulo,
  onClose,
  children,
}: {
  titulo: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/20" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80%] w-full overflow-y-auto rounded-t-[16px] bg-surface-raised px-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-float"
      >
        <div className="sticky top-0 bg-surface-raised pt-3 pb-2">
          <div className="mx-auto mb-3 h-1 w-9 rounded-bar bg-border-strong" />
          <p className="text-body font-bold">{titulo}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
