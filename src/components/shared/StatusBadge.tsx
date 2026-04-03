interface StatusBadgeProps {
  status: string
  varijanta?: 'sjednica' | 'nabava' | 'izvjesce' | 'clan' | 'racun' | 'kategorija' | 'clanarina'
}

const STILOVI: Record<string, Record<string, { bg: string; text: string; label: string }>> = {
  sjednica: {
    planirana: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Planirana' },
    pozivnica_poslana: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pozivnica poslana' },
    odrzana: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Održana' },
    zapisnik_potpisan: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Zapisnik potpisan' },
    arhivirana: { bg: 'bg-[#3a3a3e]', text: 'text-[#999]', label: 'Arhivirana' },
  },
  clan: {
    aktivan: { bg: 'bg-green-900/25', text: 'text-green-400', label: 'Aktivan' },
    neaktivan: { bg: 'bg-[#3a3a3e]', text: 'text-[#999]', label: 'Neaktivan' },
    istupio: { bg: 'bg-yellow-900/25', text: 'text-yellow-400', label: 'Istupio' },
    iskljucen: { bg: 'bg-red-900/25', text: 'text-red-400', label: 'Isključen' },
  },
  izvjesce: {
    predano: { bg: 'bg-green-900/25', text: 'text-green-400', label: 'Predano' },
    u_pripremi: { bg: 'bg-yellow-900/25', text: 'text-yellow-400', label: 'U pripremi' },
    nije_predano: { bg: 'bg-red-900/25', text: 'text-red-400', label: 'Nije predano' },
  },
  nabava: {
    zahtjev: { bg: 'bg-blue-900/25', text: 'text-blue-400', label: 'Zahtjev' },
    odobreno: { bg: 'bg-green-900/25', text: 'text-green-400', label: 'Odobreno' },
    odbijeno: { bg: 'bg-red-900/25', text: 'text-red-400', label: 'Odbijeno' },
    naruceno: { bg: 'bg-purple-900/25', text: 'text-purple-400', label: 'Naručeno' },
    isporuceno: { bg: 'bg-emerald-900/25', text: 'text-emerald-400', label: 'Isporučeno' },
    placeno: { bg: 'bg-[#3a3a3e]', text: 'text-[#999]', label: 'Plaćeno' },
  },
  racun: {
    primljeno: { bg: 'bg-yellow-900/25', text: 'text-yellow-400', label: 'Primljeno' },
    u_obradi: { bg: 'bg-orange-900/25', text: 'text-orange-400', label: 'Poslano knjigovođi' },
    odobreno: { bg: 'bg-blue-900/25', text: 'text-blue-400', label: 'Likvidirano' },
    placeno: { bg: 'bg-green-900/25', text: 'text-green-400', label: 'Plaćeno' },
    odbijeno: { bg: 'bg-red-900/25', text: 'text-red-400', label: 'Odbijeno' },
  },
  kategorija: {
    dobrovoljni_vatrogasac: { bg: '', text: 'text-[#bbb]', label: 'Operativni' },
    prikljuceni: { bg: '', text: 'text-[#bbb]', label: 'Priključeni' },
    pocasni: { bg: '', text: 'text-[#bbb]', label: 'Počasni' },
    podmladak: { bg: '', text: 'text-[#bbb]', label: 'Podmladak' },
  },
  clanarina: {
    placeno: { bg: 'bg-green-900/25', text: 'text-green-400', label: 'Plaćeno' },
    neplaceno: { bg: 'bg-red-900/25', text: 'text-red-400', label: 'Neplaćeno' },
    nepoznato: { bg: '', text: 'text-[#777]', label: '—' },
  },
}

export function StatusBadge({ status, varijanta = 'sjednica' }: StatusBadgeProps) {
  const stil = STILOVI[varijanta]?.[status] || { bg: 'bg-[#3a3a3e]', text: 'text-[#999]', label: status }

  if (varijanta === 'kategorija') {
    return <span className={`text-xs ${stil.text}`}>{stil.label}</span>
  }

  if (varijanta === 'clanarina' && status === 'nepoznato') {
    return <span className="text-[#777] text-xs">—</span>
  }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${stil.bg} ${stil.text}`}>
      {stil.label}
    </span>
  )
}
