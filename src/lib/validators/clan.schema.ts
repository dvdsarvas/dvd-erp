import { z } from 'zod'

function validateOIB(oib: string): boolean {
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

export const clanSchema = z.object({
  ime: z.string().min(1, 'Ime je obavezno').max(100),
  prezime: z.string().min(1, 'Prezime je obavezno').max(100),
  oib: z.string().length(11, 'OIB mora imati 11 znamenki').refine(validateOIB, 'Neispravan OIB (kontrolna znamenka)'),
  datum_rodenja: z.string().optional().nullable(),
  mjesto_rodenja: z.string().optional().nullable(),
  ulica: z.string().optional().nullable(),
  kucni_broj: z.string().optional().nullable(),
  mjesto: z.string().optional().nullable(),
  postanski_broj: z.string().optional().nullable(),
  mobitel: z.string().optional().nullable(),
  email: z.string().email('Neispravan email').optional().nullable().or(z.literal('')),
  kategorija: z.enum(['dobrovoljni_vatrogasac', 'prikljuceni', 'pocasni', 'podmladak']),
  datum_uclanivanja: z.string().min(1, 'Datum učlanjivanja je obavezan'),
  status: z.enum(['aktivan', 'neaktivan', 'istupio', 'iskljucen']).default('aktivan'),
  vatrogasno_zvanje: z.string().optional().nullable(),
  datum_stjecanja_zvanja: z.string().optional().nullable(),
})

export type ClanFormData = z.infer<typeof clanSchema>
