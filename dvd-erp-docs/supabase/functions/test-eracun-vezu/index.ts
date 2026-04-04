// supabase/functions/test-eracun-vezu/index.ts
// Testira vezu s ePoslovanje/mojeRačun API-jem
// Poziva se iz PostavkePage → TabEracun → "Testiraj vezu"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const API_URLS: Record<string, string> = {
  eposlovanje: 'https://eracun.eposlovanje.hr/apis/v2',
  moj_eracun:  'https://api.moj-eracun.hr/apis/v2',
}

serve(async (req) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const { posrednik, username, password, companyId } = await req.json()

    if (!posrednik || !username || !password || !companyId) {
      return new Response(
        JSON.stringify({ ok: false, poruka: 'Sva polja su obavezna (posrednik, username, password, companyId)' }),
        { headers }
      )
    }

    const baseUrl = API_URLS[posrednik]
    if (!baseUrl) {
      return new Response(
        JSON.stringify({ ok: false, poruka: `Nepodržani posrednik: ${posrednik}. Podržani: eposlovanje, moj_eracun` }),
        { headers }
      )
    }

    // Pozovi queryInbox za test veze
    const resp = await fetch(`${baseUrl}/queryInbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, companyId }),
    })

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      return new Response(
        JSON.stringify({
          ok: false,
          poruka: `API greška ${resp.status}: ${txt.slice(0, 300) || resp.statusText}`,
        }),
        { headers }
      )
    }

    const data = await resp.json()
    const dokumenti = data.documents ?? data.Documents ?? data.items ?? []

    return new Response(
      JSON.stringify({
        ok: true,
        poruka: `Veza uspješna! ${dokumenti.length} dokumenata u inboxu.`,
        brDokumenata: dokumenti.length,
      }),
      { headers }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        poruka: `Greška: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { headers, status: 500 }
    )
  }
})
