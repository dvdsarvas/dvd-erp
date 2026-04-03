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
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#242428] border border-[#333338] rounded-xl shadow-2xl w-full max-w-sm p-6">
          <h3 className="text-base font-semibold text-white mb-2">{naslov}</h3>
          <p className="text-sm text-[#999] mb-5">{poruka}</p>
          <div className="flex justify-end gap-3">
            <button onClick={onCancel}
              className="px-4 py-2 text-sm text-[#999] hover:text-white transition-colors">
              Odustani
            </button>
            <button onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                destruktivno
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}>
              {potvrdaTekst}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
