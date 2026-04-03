import { z } from 'zod'

export const nabavaSchema = z.object({
  opis: z.string().min(1, 'Opis nabave je obavezan'),
  procijenjeni_iznos: z.number().positive('Iznos mora biti pozitivan').optional().nullable(),
  dobavljac_naziv: z.string().optional().nullable(),
  status: z.enum(['zahtjev', 'odobreno', 'odbijeno', 'naruceno', 'isporuceno', 'placeno']).default('zahtjev'),
})

export type NabavaFormData = z.infer<typeof nabavaSchema>
