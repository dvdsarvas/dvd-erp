// supabase/functions/send-reminder/index.ts
// Okidač: pg_cron 07:00 UTC svaki dan
// Svrha: Provjeri nadolazeće rokove i pošalji email alarme

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Koliko dana ranije šaljemo alarm po kategoriji
const PRAGOVI = {
  zakonska_izvjesca: [30, 14, 7],
  registracija_vozila: [60, 30],
  tehnicki_pregled: [60, 30],
  zdravstveni_pregled: [60, 30],
  certifikati: [60, 30],
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const danas = new Date()
  const log: string[] = []

  // --------------------------------------------------------
  // 1. Zakonska izvješća
  // --------------------------------------------------------
  const za30dana = addDays(danas, 30)
  const { data: izvjesca } = await supabase
    .from('zakonska_izvjesca')
    .select('naziv, rok, primatelj')
    .lte('rok', za30dana.toISOString().split('T')[0])
    .neq('status', 'predano')
    .neq('status', 'prihvaceno')
    .not('rok', 'is', null)

  if (izvjesca && izvjesca.length > 0) {
    const hitno = izvjesca.filter(i => daysDiff(danas, new Date(i.rok)) <= 7)
    const upozorenje = izvjesca.filter(i => {
      const d = daysDiff(danas, new Date(i.rok))
      return d > 7 && d <= 14
    })

    if (hitno.length > 0) {
      await sendEmail({
        to: await getPresjednikEmail(supabase),
        subject: `🚨 HITNO: ${hitno.length} zakonskih izvješća u roku 7 dana — DVD ERP`,
        html: buildIzvjescaEmail(hitno, 'hitno'),
      })
      log.push(`Poslano hitno upozorenje za ${hitno.length} izvješća`)
    }

    if (upozorenje.length > 0) {
      await sendEmail({
        to: await getPresjednikEmail(supabase),
        subject: `⚠️ Podsjetnik: ${upozorenje.length} zakonskih izvješća u roku 14 dana — DVD ERP`,
        html: buildIzvjescaEmail(upozorenje, 'upozorenje'),
      })
      log.push(`Poslano upozorenje za ${upozorenje.length} izvješća`)
    }
  }

  // --------------------------------------------------------
  // 2. Registracije i tehnički pregledi vozila
  // --------------------------------------------------------
  const za60dana = addDays(danas, 60)
  const { data: vozila } = await supabase
    .from('imovina')
    .select('naziv, reg_oznaka, registracija_do, tehnicki_do')
    .eq('vrsta', 'vozilo')
    .neq('status', 'otpisano')
    .or(`registracija_do.lte.${za60dana.toISOString().split('T')[0]},tehnicki_do.lte.${za60dana.toISOString().split('T')[0]}`)

  if (vozila && vozila.length > 0) {
    await sendEmail({
      to: await getPresjednikEmail(supabase),
      subject: `🚒 Podsjetnik: rokovi vozila — DVD ERP`,
      html: buildVozilaEmail(vozila, danas),
    })
    log.push(`Poslano upozorenje za ${vozila.length} vozila`)
  }

  // --------------------------------------------------------
  // 3. Zdravstveni pregledi vatrogasaca
  // --------------------------------------------------------
  const { data: pregledi } = await supabase
    .from('zdravstveni_pregledi')
    .select('datum_sljedeceg, clan:clanovi(ime, prezime)')
    .lte('datum_sljedeceg', za60dana.toISOString().split('T')[0])

  if (pregledi && pregledi.length > 0) {
    await sendEmail({
      to: await getPresjednikEmail(supabase),
      subject: `🏥 Podsjetnik: zdravstveni pregledi vatrogasaca — DVD ERP`,
      html: buildZdravljeEmail(pregledi, danas),
    })
    log.push(`Poslano upozorenje za ${pregledi.length} zdravstvenih pregleda`)
  }

  // --------------------------------------------------------
  // Upiši log
  // --------------------------------------------------------
  console.log('send-reminder završen:', log)
  return new Response(
    JSON.stringify({ ok: true, log }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

// ============================================================
// HELPERS
// ============================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function daysDiff(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

async function getPresjednikEmail(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase
    .from('korisnici')
    .select('email')
    .in('uloga', ['predsjednik', 'admin'])
    .eq('aktivan', true)
    .limit(1)
    .single()
  return data?.email ?? ''
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!to) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'DVD ERP <noreply@dvd-erp.hr>',
      to,
      subject,
      html,
    }),
  })
}

function buildIzvjescaEmail(
  izvjesca: { naziv: string; rok: string; primatelj: string }[],
  razina: 'hitno' | 'upozorenje'
): string {
  const boja = razina === 'hitno' ? '#CC0000' : '#E65C00'
  const stavke = izvjesca
    .map(i => `<tr><td style="padding:8px">${i.naziv}</td><td style="padding:8px">${i.rok}</td><td style="padding:8px">${i.primatelj}</td></tr>`)
    .join('')
  return `
    <h2 style="color:${boja}">Podsjetnik: nadolazeća zakonska izvješća</h2>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
      <thead><tr style="background:#f5f5f5">
        <th style="padding:8px;text-align:left">Izvješće</th>
        <th style="padding:8px;text-align:left">Rok</th>
        <th style="padding:8px;text-align:left">Primatelj</th>
      </tr></thead>
      <tbody>${stavke}</tbody>
    </table>
    <p style="margin-top:16px"><a href="https://sarvas.dvd-erp.hr/zakonska-izvjesca">Otvorite DVD ERP →</a></p>
  `
}

function buildVozilaEmail(
  vozila: { naziv: string; reg_oznaka?: string; registracija_do?: string; tehnicki_do?: string }[],
  danas: Date
): string {
  const stavke = vozila
    .map(v => `<tr>
      <td style="padding:8px">${v.naziv} ${v.reg_oznaka ? `(${v.reg_oznaka})` : ''}</td>
      <td style="padding:8px">${v.registracija_do ?? '—'}</td>
      <td style="padding:8px">${v.tehnicki_do ?? '—'}</td>
    </tr>`)
    .join('')
  return `
    <h2 style="color:#1F3864">Podsjetnik: rokovi vozila</h2>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
      <thead><tr style="background:#f5f5f5">
        <th style="padding:8px;text-align:left">Vozilo</th>
        <th style="padding:8px;text-align:left">Registracija do</th>
        <th style="padding:8px;text-align:left">Tehnički do</th>
      </tr></thead>
      <tbody>${stavke}</tbody>
    </table>
    <p style="margin-top:16px"><a href="https://sarvas.dvd-erp.hr/imovina">Otvorite DVD ERP →</a></p>
  `
}

function buildZdravljeEmail(pregledi: unknown[], danas: Date): string {
  return `
    <h2 style="color:#1F3864">Podsjetnik: zdravstveni pregledi vatrogasaca</h2>
    <p>${pregledi.length} vatrogasca ima zdravstveni pregled koji uskoro ističe.</p>
    <p><a href="https://sarvas.dvd-erp.hr/clanstvo">Pogledajte evidenciju →</a></p>
  `
}
