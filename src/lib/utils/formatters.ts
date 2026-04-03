import { format, formatDistanceToNow } from 'date-fns'
import { hr } from 'date-fns/locale'

/**
 * Formatira datum u hrvatski format: "28.03.2026."
 */
export function formatDate(datum: string | Date | null | undefined): string {
  if (!datum) return '—'
  try {
    return format(new Date(datum), 'dd.MM.yyyy.', { locale: hr })
  } catch {
    return '—'
  }
}

/**
 * Formatira datum u dugi format: "28. ožujka 2026."
 */
export function formatDateLong(datum: string | Date | null | undefined): string {
  if (!datum) return '—'
  try {
    return format(new Date(datum), "d. MMMM yyyy.", { locale: hr })
  } catch {
    return '—'
  }
}

/**
 * Formatira datum s danom u tjednu: "subota, 28.03.2026."
 */
export function formatDateWithDay(datum: string | Date | null | undefined): string {
  if (!datum) return '—'
  try {
    return format(new Date(datum), "EEEE, dd.MM.yyyy.", { locale: hr })
  } catch {
    return '—'
  }
}

/**
 * Formatira vrijeme: "18:00"
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '—'
  return time.substring(0, 5)
}

/**
 * Relativno vrijeme: "prije 3 dana", "za 5 dana"
 */
export function formatRelative(datum: string | Date | null | undefined): string {
  if (!datum) return '—'
  try {
    return formatDistanceToNow(new Date(datum), { addSuffix: true, locale: hr })
  } catch {
    return '—'
  }
}

/**
 * Formatira iznos u EUR: "1.234,56 EUR"
 */
export function formatEUR(iznos: number | null | undefined): string {
  if (iznos == null) return '—'
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(iznos)
}

/**
 * Validira hrvatski OIB (11 znamenki + kontrolna znamenka mod 11)
 */
export function validateOIB(oib: string): boolean {
  if (!oib || oib.length !== 11 || !/^\d{11}$/.test(oib)) return false

  let a = 10
  for (let i = 0; i < 10; i++) {
    a = a + parseInt(oib[i], 10)
    a = a % 10
    if (a === 0) a = 10
    a *= 2
    a = a % 11
  }

  let kontrolna = 11 - a
  if (kontrolna === 10) kontrolna = 0

  return kontrolna === parseInt(oib[10], 10)
}

/**
 * Formatira telefonski broj: "+385 95 396 5265"
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  // Ukloni sve osim brojeva i +
  const clean = phone.replace(/[^\d+]/g, '')
  if (clean.startsWith('+385') && clean.length >= 12) {
    return `+385 ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`
  }
  return phone
}
