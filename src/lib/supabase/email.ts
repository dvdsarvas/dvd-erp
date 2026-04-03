import { supabase } from './client'

export interface EmailParams {
  primatelji: string[]
  predmet: string
  html: string
  tip: string
  prilog?: {
    naziv: string
    sadrzaj: string // base64
    tip: string
  }
}

export interface EmailResult {
  uspjesno: number
  greske: number
  error?: string
}

/**
 * Šalje email putem Supabase Edge Function.
 * Edge Function koristi Resend API i logira u email_logovi.
 */
export async function posaljiEmail(params: EmailParams): Promise<EmailResult> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: params,
  })

  if (error) {
    return { uspjesno: 0, greske: params.primatelji.length, error: error.message }
  }

  return data as EmailResult
}

/**
 * Konvertira Blob u base64 string (za slanje kao prilog).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Ukloni "data:...;base64," prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
