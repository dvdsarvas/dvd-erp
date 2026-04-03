import { differenceInDays } from 'date-fns'

/**
 * Računa broj dana do zadanog datuma (pozitivno = budućnost, negativno = prošlost)
 */
export function daniDo(datum: string | Date | null | undefined): number | null {
  if (!datum) return null
  try {
    return differenceInDays(new Date(datum), new Date())
  } catch {
    return null
  }
}

/**
 * Vraća status roka prema broju dana
 */
export function statusRoka(datum: string | Date | null | undefined): 'prosao' | 'hitno' | 'upozorenje' | 'ok' | null {
  const dani = daniDo(datum)
  if (dani === null) return null
  if (dani < 0) return 'prosao'
  if (dani <= 7) return 'hitno'
  if (dani <= 30) return 'upozorenje'
  return 'ok'
}

/**
 * Vraća Tailwind klasu boje prema statusu roka
 */
export function bojaRoka(datum: string | Date | null | undefined): string {
  const status = statusRoka(datum)
  switch (status) {
    case 'prosao': return 'text-red-400'
    case 'hitno': return 'text-orange-400'
    case 'upozorenje': return 'text-yellow-400'
    case 'ok': return 'text-green-400'
    default: return 'text-[#777]'
  }
}

/**
 * Vraća Tailwind klasu pozadine prema statusu roka
 */
export function bgRoka(datum: string | Date | null | undefined): string {
  const status = statusRoka(datum)
  switch (status) {
    case 'prosao': return 'bg-red-900/25 text-red-400'
    case 'hitno': return 'bg-orange-900/25 text-orange-400'
    case 'upozorenje': return 'bg-yellow-900/25 text-yellow-400'
    case 'ok': return 'bg-green-900/25 text-green-400'
    default: return 'bg-[#3a3a3e] text-[#777]'
  }
}

/**
 * Formatira countdown tekst
 */
export function countdownTekst(datum: string | Date | null | undefined): string {
  const dani = daniDo(datum)
  if (dani === null) return '—'
  if (dani < 0) return `${Math.abs(dani)}d kasni`
  if (dani === 0) return 'Danas'
  return `${dani}d`
}
