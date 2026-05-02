// Edge Function: kreiraj-korisnika
// Atomarno kreira novog korisnika u auth.users + public.korisnici.
// Pozivatelj mora biti aktivan admin (RLS-equivalent provjera unutar funkcije).
// Deploy: supabase functions deploy kreiraj-korisnika

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface KreirajKorisnikaRequest {
  email: string
  ime: string
  prezime: string
  uloga: string
  lozinka: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Nije autentificiran' }, 401)
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(token)
    if (callerErr || !caller) {
      return json({ error: 'Nevažeći token' }, 401)
    }

    const { data: callerProfile } = await admin
      .from('korisnici')
      .select('uloga, aktivan')
      .eq('id', caller.id)
      .single()

    if (!callerProfile?.aktivan || callerProfile.uloga !== 'admin') {
      return json({ error: 'Samo administratori mogu kreirati korisnike' }, 403)
    }

    const body: KreirajKorisnikaRequest = await req.json()
    const { email, ime, prezime, uloga, lozinka } = body

    if (!email || !ime || !prezime || !uloga || !lozinka) {
      return json({ error: 'Sva polja su obavezna' }, 400)
    }

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: lozinka,
      email_confirm: true,
    })
    if (authErr || !authData.user) {
      return json({ error: `Auth greška: ${authErr?.message ?? 'nepoznata'}` }, 500)
    }

    const { data: korisnik, error: insErr } = await admin
      .from('korisnici')
      .insert({
        id: authData.user.id,
        email,
        ime,
        prezime,
        uloga,
        aktivan: true,
      })
      .select()
      .single()

    if (insErr) {
      // Rollback — bez ovoga ostaje siroče u auth.users
      await admin.auth.admin.deleteUser(authData.user.id)
      return json({ error: `DB greška: ${insErr.message}` }, 500)
    }

    return json({ ok: true, korisnik })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
