// Edge Function: send-email
// Generičko slanje emaila s opcionim prilogom putem Resend API
// Deploy: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EmailRequest {
  primatelji: string[]
  predmet: string
  html: string
  tip: string
  prilog?: {
    naziv: string
    sadrzaj: string // base64
    tip: string     // MIME type
  }
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Provjeri autentifikaciju
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nije autentificiran' }), { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Provjeri da je korisnik prijavljen
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Nevažeći token' }), { status: 401 })
    }

    // Parsiraj tijelo zahtjeva
    const body: EmailRequest = await req.json()
    const { primatelji, predmet, html, tip, prilog } = body

    if (!primatelji?.length || !predmet || !html) {
      return new Response(JSON.stringify({ error: 'Nedostaju obavezna polja' }), { status: 400 })
    }

    // Filtriraj prazne/nevažeće emailove
    const validniEmailovi = primatelji.filter(e => e && e.includes('@'))
    if (validniEmailovi.length === 0) {
      return new Response(JSON.stringify({ error: 'Nema valjanih email adresa' }), { status: 400 })
    }

    // Pripremi Resend payload
    const resendPayload: Record<string, unknown> = {
      from: 'DVD Sarvaš <onboarding@resend.dev>',
      to: validniEmailovi,
      subject: predmet,
      html: html,
    }

    // Dodaj prilog ako postoji
    if (prilog?.sadrzaj) {
      resendPayload.attachments = [{
        filename: prilog.naziv,
        content: prilog.sadrzaj,
        type: prilog.tip || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }]
    }

    // Pošalji putem Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      // Logiraj grešku
      for (const email of validniEmailovi) {
        await supabase.from('email_logovi').insert({
          tip: tip || 'dokument',
          primatelj: email,
          predmet: predmet,
          status: 'greska',
          greska: resendData.message || 'Nepoznata greška',
        })
      }

      return new Response(JSON.stringify({
        error: resendData.message || 'Greška pri slanju',
        uspjesno: 0,
        greske: validniEmailovi.length,
      }), { status: 500 })
    }

    // Logiraj uspješno slanje
    for (const email of validniEmailovi) {
      await supabase.from('email_logovi').insert({
        tip: tip || 'dokument',
        primatelj: email,
        predmet: predmet,
        status: 'poslan',
      })
    }

    return new Response(JSON.stringify({
      uspjesno: validniEmailovi.length,
      greske: 0,
      id: resendData.id,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
