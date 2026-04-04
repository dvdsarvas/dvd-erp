// supabase/functions/send-reminder/index.ts
// Okidač: pg_cron — dnevno 07:00 UTC za alarme, ponedjeljkom za digest
// Svrha: Provjeri nadolazeće rokove i pošalji email alarme

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const danas = new Date()
  const log: string[] = []

  // Provjeri je li zahtjev za weekly digest
  let isWeeklyDigest = false
  try {
    const body = await req.json()
    isWeeklyDigest = body?.type === 'weekly_digest'
  } catch { /* nije JSON body — normalni dnevni trigger */ }

  // Ako je ponedjeljak ili eksplicitni zahtjev — pošalji digest
  if (isWeeklyDigest || danas.getDay() === 1) {
    const digest = await generirajDigest(supabase, danas)
    if (digest.hitnoCount > 0 || digest.ovajTjedan.length > 0) {
      await sendEmail({
        to: await getPresjednikEmail(supabase),
        subject: digest.hitnoCount > 0
          ? `🚨 Tjedni pregled: ${digest.hitnoCount} hitno — DVD ERP`
          : `📋 Tjedni pregled — DVD ERP`,
        html: buildDigestEmail(digest),
      })
      log.push(`Weekly digest poslan: ${digest.hitnoCount} hitno, ${digest.ovajTjedan.length} uskoro`)
    } else {
      log.push('Weekly digest: sve OK, nema upozorenja')
    }
  }

  // Dnevne provjere (samo ako NIJE weekly digest poziv)
  if (!isWeeklyDigest) {
    // Zakonska izvješća
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
      if (hitno.length > 0) {
        await sendEmail({
          to: await getPresjednikEmail(supabase),
          subject: `🚨 HITNO: ${hitno.length} zakonskih izvješća u roku 7 dana — DVD ERP`,
          html: buildIzvjescaEmail(hitno, 'hitno'),
        })
        log.push(`Hitno upozorenje za ${hitno.length} izvješća`)
      }
    }

    // Registracije vozila
    const za60dana = addDays(danas, 60)
    const { data: vozila } = await supabase
      .from('imovina')
      .select('naziv, reg_oznaka, registracija_do, tehnicki_do')
      .eq('vrsta', 'vozilo')
      .neq('status', 'otpisano')
      .or(`registracija_do.lte.${za60dana.toISOString().split('T')[0]},tehnicki_do.lte.${za60dana.toISOString().split('T')[0]}`)

    if (vozila && vozila.length > 0) {
      const kriticno = vozila.filter(v =>
        (v.registracija_do && daysDiff(danas, new Date(v.registracija_do)) <= 14) ||
        (v.tehnicki_do && daysDiff(danas, new Date(v.tehnicki_do)) <= 14)
      )
      if (kriticno.length > 0) {
        await sendEmail({
          to: await getPresjednikEmail(supabase),
          subject: `🚒 HITNO: rokovi vozila — DVD ERP`,
          html: buildVozilaEmail(kriticno, danas),
        })
        log.push(`Hitno za ${kriticno.length} vozila`)
      }
    }
  }

  console.log('send-reminder završen:', log)
  return new Response(JSON.stringify({ ok: true, log }), { headers: { 'Content-Type': 'application/json' } })
})

// ============================================================
// WEEKLY DIGEST
// ============================================================

interface DigestPodaci {
  hitnoCount: number
  hitnoStavke: string[]
  ovajTjedan: string[]
  zelenoCount: number
}

async function generirajDigest(supabase: ReturnType<typeof createClient>, danas: Date): Promise<DigestPodaci> {
  const za30 = addDays(danas, 30)

  const [izvjesca, racuni, zdravlje, vozila] = await Promise.all([
    supabase.from('zakonska_izvjesca').select('naziv, rok')
      .in('status', ['nije_predano', 'u_pripremi'])
      .lte('rok', za30.toISOString().split('T')[0]),
    supabase.from('racuni').select('id', { count: 'exact' })
      .in('status', ['primljeno', 'u_obradi']),
    supabase.from('zdravstveni_pregledi').select('datum_sljedeceg, clanovi(prezime)')
      .lte('datum_sljedeceg', za30.toISOString().split('T')[0]),
    supabase.from('imovina').select('naziv, registracija_do')
      .eq('vrsta', 'vozilo')
      .lte('registracija_do', za30.toISOString().split('T')[0])
  ])

  const hitno: string[] = []
  const uskoro: string[] = []

  izvjesca.data?.forEach(iz => {
    if (!iz.rok) return
    const dani = daysDiff(danas, new Date(iz.rok))
    const tekst = `${iz.naziv} (${dani < 0 ? `${Math.abs(dani)}d kasni` : `za ${dani}d`})`
    dani <= 7 ? hitno.push(tekst) : uskoro.push(tekst)
  })

  if ((racuni.count || 0) > 0)
    hitno.push(`${racuni.count} računa čeka likvidaciju predsjednika`)

  zdravlje.data?.forEach(z => {
    if (!z.datum_sljedeceg) return
    const dani = daysDiff(danas, new Date(z.datum_sljedeceg))
    const tekst = `Liječnički: ${(z.clanovi as any)?.prezime} (${dani < 0 ? 'ISTEKAO' : `za ${dani}d`})`
    dani <= 14 ? hitno.push(tekst) : uskoro.push(tekst)
  })

  vozila.data?.forEach(v => {
    if (!v.registracija_do) return
    const dani = daysDiff(danas, new Date(v.registracija_do))
    const tekst = `Registracija: ${v.naziv} (${dani < 0 ? 'ISTEKLA' : `za ${dani}d`})`
    dani <= 14 ? hitno.push(tekst) : uskoro.push(tekst)
  })

  return {
    hitnoCount: hitno.length,
    hitnoStavke: hitno.slice(0, 8),
    ovajTjedan: uskoro.slice(0, 8),
    zelenoCount: hitno.length === 0 && uskoro.length === 0 ? 1 : 0,
  }
}

function buildDigestEmail(d: DigestPodaci): string {
  const hitnoHtml = d.hitnoStavke.length > 0
    ? `<h3 style="color:#CC0000">🔴 Hitno (${d.hitnoCount})</h3><ul>${d.hitnoStavke.map(s => `<li>${s}</li>`).join('')}</ul>`
    : ''
  const uskoroHtml = d.ovajTjedan.length > 0
    ? `<h3 style="color:#E65C00">🟠 Uskoro</h3><ul>${d.ovajTjedan.map(s => `<li>${s}</li>`).join('')}</ul>`
    : ''
  const zelenoHtml = d.zelenoCount > 0
    ? '<h3 style="color:#10B981">✅ Sve u redu!</h3><p>Nema hitnih ni nadolazećih rokova.</p>'
    : ''

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1F3864;margin-bottom:4px">DVD Sarvaš — Tjedni pregled</h2>
      <p style="color:#777;font-size:13px;margin-top:0">${new Date().toLocaleDateString('hr-HR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      ${hitnoHtml}
      ${uskoroHtml}
      ${zelenoHtml}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:12px;color:#999"><a href="https://sarvas.dvd-erp.hr/akcije">Otvori Akcijski centar →</a></p>
    </div>
  `
}

// ============================================================
// HELPERS
// ============================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date); result.setDate(result.getDate() + days); return result
}

function daysDiff(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

async function getPresjednikEmail(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase.from('korisnici').select('email')
    .in('uloga', ['predsjednik', 'admin']).eq('aktivan', true).limit(1).single()
  return data?.email ?? ''
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!to || !RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'DVD ERP <noreply@dvd-erp.hr>', to, subject, html }),
  })
}

function buildIzvjescaEmail(izvjesca: { naziv: string; rok: string; primatelj: string }[], razina: 'hitno' | 'upozorenje'): string {
  const boja = razina === 'hitno' ? '#CC0000' : '#E65C00'
  const stavke = izvjesca.map(i => `<tr><td style="padding:8px">${i.naziv}</td><td style="padding:8px">${i.rok}</td><td style="padding:8px">${i.primatelj}</td></tr>`).join('')
  return `
    <h2 style="color:${boja}">Podsjetnik: nadolazeća zakonska izvješća</h2>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
      <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Izvješće</th><th style="padding:8px;text-align:left">Rok</th><th style="padding:8px;text-align:left">Primatelj</th></tr></thead>
      <tbody>${stavke}</tbody>
    </table>
    <p style="margin-top:16px"><a href="https://sarvas.dvd-erp.hr/zakonska-izvjesca">Otvorite DVD ERP →</a></p>
  `
}

function buildVozilaEmail(vozila: { naziv: string; reg_oznaka?: string; registracija_do?: string; tehnicki_do?: string }[], _danas: Date): string {
  const stavke = vozila.map(v => `<tr><td style="padding:8px">${v.naziv} ${v.reg_oznaka ? `(${v.reg_oznaka})` : ''}</td><td style="padding:8px">${v.registracija_do ?? '—'}</td><td style="padding:8px">${v.tehnicki_do ?? '—'}</td></tr>`).join('')
  return `
    <h2 style="color:#1F3864">Podsjetnik: rokovi vozila</h2>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
      <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Vozilo</th><th style="padding:8px;text-align:left">Registracija do</th><th style="padding:8px;text-align:left">Tehnički do</th></tr></thead>
      <tbody>${stavke}</tbody>
    </table>
    <p style="margin-top:16px"><a href="https://sarvas.dvd-erp.hr/imovina">Otvorite DVD ERP →</a></p>
  `
}
