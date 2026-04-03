// supabase/functions/onboarding-init/index.ts
// Okidač: HTTP POST iz onboarding wizarda
// Svrha: Inicijalizacija podataka novog DVD-a

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface OnboardingPayload {
  // Podaci organizacije
  naziv: string
  naziv_kratki: string
  oib: string
  adresa: string
  jls: string
  vatrogasna_zajednica: string

  // Admin korisnik
  predsjednik_ime: string
  predsjednik_prezime: string
  predsjednik_email: string

  // Supabase projekt (popunjava admin)
  supabase_url: string
  supabase_anon: string
}

serve(async (req) => {
  // Provjeri Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY.slice(-10))) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload: OnboardingPayload = await req.json()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // --------------------------------------------------------
    // 1. Kreiraj admin korisnika u Supabase Auth
    // --------------------------------------------------------
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: payload.predsjednik_email,
      password: generateTempPassword(),
      email_confirm: true,
    })

    if (authError) throw new Error(`Auth error: ${authError.message}`)

    // --------------------------------------------------------
    // 2. Upiši u tablicu korisnici
    // --------------------------------------------------------
    await supabase.from('korisnici').insert({
      id: authUser.user?.id,
      email: payload.predsjednik_email,
      ime: payload.predsjednik_ime,
      prezime: payload.predsjednik_prezime,
      uloga: 'predsjednik',
    })

    // --------------------------------------------------------
    // 3. Kreiraj inicijalna zakonska izvješća za tekuću godinu
    // --------------------------------------------------------
    const godina = new Date().getFullYear()
    await kreirajZakonskaIzvjesca(supabase, godina)

    // --------------------------------------------------------
    // 4. Kreiraj inicijalni financijski plan
    // --------------------------------------------------------
    await kreirajFinancijskiPlan(supabase, godina)

    // --------------------------------------------------------
    // 5. Pošalji welcome email predsjedniku
    // --------------------------------------------------------
    await sendWelcomeEmail({
      to: payload.predsjednik_email,
      ime: payload.predsjednik_ime,
      naziv_dvd: payload.naziv_kratki,
      url: payload.supabase_url.replace('supabase.co', 'dvd-erp.hr'),
      tempPassword: '[pogledajte Supabase Auth email]',
    })

    return new Response(
      JSON.stringify({ ok: true, message: 'Onboarding završen' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Onboarding error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================
// HELPERS
// ============================================================

function generateTempPassword(): string {
  return Math.random().toString(36).slice(2, 10) +
         Math.random().toString(36).toUpperCase().slice(2, 6) + '!'
}

async function kreirajZakonskaIzvjesca(supabase: ReturnType<typeof createClient>, godina: number) {
  // Identičan SQL kao u seed.sql — kreiranje za tekuću godinu
  const izvjesca = [
    { naziv: `Financijsko izvješće FINA Q1 ${godina}`, vrsta: 'fina_kvartal', kvartal: 1, primatelj: 'FINA', rok: `${godina}-04-30` },
    { naziv: `Financijsko izvješće FINA Q2 ${godina}`, vrsta: 'fina_kvartal', kvartal: 2, primatelj: 'FINA', rok: `${godina}-07-31` },
    { naziv: `Financijsko izvješće FINA Q3 ${godina}`, vrsta: 'fina_kvartal', kvartal: 3, primatelj: 'FINA', rok: `${godina}-10-31` },
    { naziv: `Financijsko izvješće FINA Q4 ${godina}`, vrsta: 'fina_kvartal', kvartal: 4, primatelj: 'FINA', rok: `${godina+1}-01-31` },
    { naziv: `Godišnje financijsko izvješće ${godina}`, vrsta: 'fina_godisnje', kvartal: null, primatelj: 'FINA', rok: `${godina+1}-02-28` },
    { naziv: `Izvješće o radu skupštini ${godina}`, vrsta: 'skupstina_izvjesce', kvartal: null, primatelj: 'Skupština DVD-a', rok: `${godina}-06-30` },
    { naziv: `Financijsko izvješće skupštini ${godina}`, vrsta: 'skupstina_izvjesce', kvartal: null, primatelj: 'Skupština DVD-a', rok: `${godina}-06-30` },
    { naziv: `Plan rada ${godina+1}. (skupština)`, vrsta: 'skupstina_plan', kvartal: null, primatelj: 'Skupština DVD-a', rok: `${godina}-12-31` },
    { naziv: `Financijski plan ${godina+1}. (skupština)`, vrsta: 'skupstina_plan', kvartal: null, primatelj: 'Skupština DVD-a', rok: `${godina}-12-31` },
  ]

  for (const i of izvjesca) {
    await supabase.from('zakonska_izvjesca').upsert({
      ...i, godina, status: 'nije_predano'
    }, { onConflict: 'naziv,godina' })
  }
}

async function kreirajFinancijskiPlan(supabase: ReturnType<typeof createClient>, godina: number) {
  const { data: plan } = await supabase
    .from('financijski_planovi')
    .insert({ godina, verzija: 'original', status: 'prijedlog' })
    .select()
    .single()

  if (!plan) return

  const stavke = [
    { kategorija: 'prihod', naziv_stavke: 'Dotacija JLS (Općina)', iznos_plan: 0, redni_broj: 1 },
    { kategorija: 'prihod', naziv_stavke: 'Dotacija Vatrogasna zajednica', iznos_plan: 0, redni_broj: 2 },
    { kategorija: 'prihod', naziv_stavke: 'Donacije pravnih osoba', iznos_plan: 0, redni_broj: 3 },
    { kategorija: 'prihod', naziv_stavke: 'Članarine', iznos_plan: 0, redni_broj: 4 },
    { kategorija: 'prihod', naziv_stavke: 'Ostali prihodi', iznos_plan: 0, redni_broj: 5 },
    { kategorija: 'rashod', naziv_stavke: 'Osobna zaštitna oprema', iznos_plan: 0, redni_broj: 10 },
    { kategorija: 'rashod', naziv_stavke: 'Gorivo i servis vozila', iznos_plan: 0, redni_broj: 11 },
    { kategorija: 'rashod', naziv_stavke: 'Osposobljavanje vatrogasaca', iznos_plan: 0, redni_broj: 12 },
    { kategorija: 'rashod', naziv_stavke: 'Zdravstveni pregledi', iznos_plan: 0, redni_broj: 13 },
    { kategorija: 'rashod', naziv_stavke: 'Tekuće poslovanje', iznos_plan: 0, redni_broj: 14 },
    { kategorija: 'rashod', naziv_stavke: 'Ostali rashodi', iznos_plan: 0, redni_broj: 15 },
  ]

  await supabase.from('financijski_plan_stavke').insert(
    stavke.map(s => ({ ...s, plan_id: plan.id }))
  )
}

async function sendWelcomeEmail({ to, ime, naziv_dvd, url, tempPassword }: {
  to: string; ime: string; naziv_dvd: string; url: string; tempPassword: string
}) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'DVD ERP <noreply@dvd-erp.hr>',
      to,
      subject: `Dobrodošli u DVD ERP — ${naziv_dvd}`,
      html: `
        <h2>Dobrodošli, ${ime}!</h2>
        <p>Vaš DVD ERP sustav za <strong>${naziv_dvd}</strong> je spreman.</p>
        <p><strong>Pristup:</strong> <a href="${url}">${url}</a></p>
        <p>Prijavite se s vašom email adresom. Kod prvog prijave postavite vlastitu lozinku.</p>
        <hr>
        <p style="color:#666;font-size:12px">
          DVD ERP — Sustav upravljanja dobrovoljnim vatrogasnim društvom
        </p>
      `,
    }),
  })
}
