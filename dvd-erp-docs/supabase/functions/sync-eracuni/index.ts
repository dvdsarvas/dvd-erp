// supabase/functions/sync-eracuni/index.ts
// Okidač: pg_cron svakih sat vremena
// Svrha: Automatsko preuzimanje novih e-računa iz ePoslovanje/mojeRačun

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const API_URLS: Record<string, string> = {
  eposlovanje: 'https://eracun.eposlovanje.hr/apis/v2',
  moj_eracun:  'https://api.moj-eracun.hr/apis/v2',
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const log: string[] = []
  let uvezeno = 0

  try {
    const { data: config, error: cfgErr } = await supabase
      .from('eracun_konfiguracija')
      .select('*')
      .eq('aktivan', true)
      .single()

    if (cfgErr || !config) {
      return new Response(JSON.stringify({ ok: true, poruka: 'e-Račun nije konfiguriran' }))
    }

    const baseUrl = API_URLS[config.posrednik]
    if (!baseUrl) {
      return new Response(JSON.stringify({ ok: false, greska: 'Nepodržani posrednik' }))
    }

    const auth = { username: config.api_username, password: config.api_password, companyId: config.company_id }

    // Dohvati inbox
    const inboxResp = await fetch(`${baseUrl}/queryInbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...auth, documentStatus: 99 }),
    })

    if (!inboxResp.ok) {
      const greska = `queryInbox greška: ${inboxResp.status}`
      await supabase.from('eracun_konfiguracija')
        .update({ greska_zadnja: greska, updated_at: new Date().toISOString() })
        .eq('id', config.id)
      return new Response(JSON.stringify({ ok: false, greska }), { status: 500 })
    }

    const inbox = await inboxResp.json()
    const dokumenti = inbox.documents ?? inbox.Documents ?? inbox.items ?? []
    log.push(`Inbox: ${dokumenti.length} dokumenata`)

    for (const dok of dokumenti) {
      const docId = String(dok.documentId ?? dok.DocumentId ?? dok.id)

      // Provjeri duplikat
      const { count } = await supabase.from('racuni').select('id', { count: 'exact' }).eq('eracun_document_id', docId)
      if (count && count > 0) { log.push(`Preskačem ${docId}`); continue }

      // Preuzmi XML
      const docResp = await fetch(`${baseUrl}/receiveDocument/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth),
      })
      if (!docResp.ok) { log.push(`Greška ${docId}: ${docResp.status}`); continue }

      const docData = await docResp.json()
      const encodedXml = docData.encodedXml ?? docData.xmlContent ?? docData.xml ?? ''
      if (!encodedXml) { log.push(`Nema XML za ${docId}`); continue }

      // Parsiraj
      const xmlString = atob(encodedXml)
      const podaci = parsirajXML(xmlString)
      if (!podaci) { log.push(`Parse greška ${docId}`); continue }

      // Generiraj interni broj
      const godina = podaci.datum_racuna.substring(0, 4)
      const { count: brCount } = await supabase.from('racuni').select('id', { count: 'exact' }).like('interni_broj', `URA-${godina}-%`)
      const intBroj = `URA-${godina}-${String((brCount ?? 0) + 1).padStart(3, '0')}`

      // Spremi
      const { error: insertErr } = await supabase.from('racuni').insert({
        vrsta: 'ulazni',
        interni_broj: intBroj,
        broj_racuna: podaci.br_racuna,
        naziv_stranke: podaci.naziv_stranke,
        oib_stranke: podaci.oib_stranke,
        datum_racuna: podaci.datum_racuna,
        datum_dospijeća: podaci.datum_dospieca || null,
        iznos_bez_pdv: podaci.iznos_bez_pdv,
        pdv_iznos: podaci.iznos_pdv,
        iznos_ukupno: podaci.iznos_ukupno,
        status: 'primljeno',
        izvor: 'eracun_api',
        eracun_document_id: docId,
        eracun_posrednik: config.posrednik,
        eracun_xml: encodedXml,
      })

      if (insertErr) { log.push(`Upis greška ${docId}: ${insertErr.message}`); continue }

      // Notificiraj ePoslovanje
      await fetch(`${baseUrl}/notifyimport/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth),
      }).catch(() => {})

      uvezeno++
      log.push(`✓ ${podaci.naziv_stranke} — ${podaci.iznos_ukupno} EUR`)
    }

    // Ažuriraj sync status
    await supabase.from('eracun_konfiguracija').update({
      zadnji_sync: new Date().toISOString(),
      zadnji_sync_br: config.zadnji_sync_br + uvezeno,
      greska_zadnja: '',
      updated_at: new Date().toISOString(),
    }).eq('id', config.id)

    return new Response(JSON.stringify({ ok: true, uvezeno, log }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, greska: String(err) }), { status: 500 })
  }
})

// XML parser za FINA UBL 2.1 format
function parsirajXML(xml: string) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const FINA = 'http://fina.hr/eracun/erp/OutgoingInvoicesData/v3.2'
    const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
    const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
    const get = (tag: string, ns: string) => doc.getElementsByTagNameNS(ns, tag)[0]?.textContent?.trim() ?? ''

    const payable = parseFloat(get('PayableAmount', CBC) || '0')
    const issueDate = get('IssueDate', CBC)
    if (!issueDate || payable <= 0) return null

    return {
      br_racuna: get('SupplierInvoiceID', FINA),
      oib_stranke: get('SupplierID', FINA),
      naziv_stranke: get('RegistrationName', CAC) || get('Name', CAC) || `Dobavljač`,
      datum_racuna: issueDate,
      datum_dospieca: get('DueDate', CBC),
      iznos_ukupno: payable,
      iznos_bez_pdv: parseFloat(get('TaxExclusiveAmount', CBC) || '0') || (payable - parseFloat(get('TaxAmount', CBC) || '0')),
      iznos_pdv: parseFloat(get('TaxAmount', CBC) || '0'),
    }
  } catch { return null }
}
