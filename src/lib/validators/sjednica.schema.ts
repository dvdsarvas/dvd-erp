import { z } from 'zod'

export const sjednicaSchema = z.object({
  vrsta: z.enum([
    'skupstina_redovna', 'skupstina_izborna', 'skupstina_izvanredna', 'skupstina_konstitutivna',
    'upravni_odbor', 'zapovjednistvo',
  ]),
  naziv: z.string().min(1, 'Naziv je obavezan').max(255),
  datum: z.string().min(1, 'Datum je obavezan'),
  sat_pocetka: z.string().optional().nullable(),
  sat_zavrsetka: z.string().optional().nullable(),
  mjesto: z.string().optional().nullable(),
  status: z.enum(['planirana', 'pozivnica_poslana', 'odrzana', 'zapisnik_potpisan', 'arhivirana']).default('planirana'),
  urbroj: z.string().optional().nullable(),
  klasa: z.string().optional().nullable(),
  napomena: z.string().optional().nullable(),
})

export type SjednicaFormData = z.infer<typeof sjednicaSchema>
