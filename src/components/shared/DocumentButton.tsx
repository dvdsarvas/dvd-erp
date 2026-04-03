import { useState } from 'react'

interface DocumentButtonProps {
  label: string
  onGenerate: () => Promise<void>
  disabled?: boolean
}

export function DocumentButton({ label, onGenerate, disabled }: DocumentButtonProps) {
  const [generating, setGenerating] = useState(false)

  async function handleClick() {
    setGenerating(true)
    try {
      await onGenerate()
    } catch (err) {
      console.error('Greška pri generiranju dokumenta:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || generating}
      className="px-3 py-2 bg-[#242428] border border-[#333338] text-[#bbb] text-xs font-medium rounded-lg hover:bg-[#2a2a2e] hover:text-white disabled:opacity-50 transition-colors"
    >
      {generating ? 'Generiranje...' : label}
    </button>
  )
}
