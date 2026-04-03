import { AnimatePresence, motion } from 'framer-motion'
import { scaleIn } from '@/lib/animations'

interface ConfirmDialogProps {
  open: boolean
  naslov: string
  poruka: string
  potvrdaTekst?: string
  destruktivno?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, naslov, poruka, potvrdaTekst = 'Potvrdi', destruktivno = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onCancel}
        >
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-accent)' }}
            className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{naslov}</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{poruka}</p>
            <div className="flex justify-end gap-3">
              <button onClick={onCancel}
                className="px-4 py-2 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Odustani
              </button>
              <button onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: destruktivno ? 'var(--danger)' : 'var(--accent)' }}>
                {potvrdaTekst}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
