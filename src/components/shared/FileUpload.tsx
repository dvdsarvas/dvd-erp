import { useRef, useState } from 'react'

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  dozvoljeniTipovi?: string[]
  maxVelicinaKB?: number
  label?: string
}

export function FileUpload({
  onUpload,
  dozvoljeniTipovi = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx'],
  maxVelicinaKB = 10240,
  label = 'Odaberi datoteku',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [naziv, setNaziv] = useState<string | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setGreska(null)

    if (file.size > maxVelicinaKB * 1024) {
      setGreska(`Datoteka je prevelika (max ${Math.round(maxVelicinaKB / 1024)}MB)`)
      return
    }

    setNaziv(file.name)
    setUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setGreska('Greška pri uploadu')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input ref={ref} type="file" accept={dozvoljeniTipovi.join(',')}
        onChange={handleChange} className="hidden" />
      <button onClick={() => ref.current?.click()} disabled={uploading}
        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors">
        {uploading ? 'Učitavanje...' : label}
      </button>
      {naziv && !greska && <span className="text-xs text-[#777] ml-2">{naziv}</span>}
      {greska && <span className="text-xs text-red-400 ml-2">{greska}</span>}
    </div>
  )
}
