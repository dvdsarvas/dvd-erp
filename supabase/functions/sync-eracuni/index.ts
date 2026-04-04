// supabase/functions/sync-eracuni/index.ts
// Okidač: pg_cron svakih sat vremena
// Svrha: Automatsko preuzimanje novih e-računa iz ePoslovanje/mojeRačun

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const API_URLS: Record<string, string> = {
  eposlovanje: 'https://eracun.eposlovanje.hr/apis/v2',
  moj_eracun:  'https://moj-eracun.hr/apis/v2',
}

const SOFTWARE_ID = 'DVD-ERP-001'
const STATUS_RECEIVING_CONFIRMED = 4

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

    // PascalCase auth payload za mer/ePoslovanje API
    const authBody = {
      Username: config.api_username,
      Password: config.api_password,
      CompanyId: config.company_id,
      SoftwareId: SOFTWARE_ID,
    }

    // 1. Dohvati inbox — POST /apis/v2/queryInbox
    const inboxResp = await fetch(`${baseUrl}/queryInbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authBody),
    })

    if (!inboxResp.ok) {
      const greska = `queryInbox greška: ${inboxResp.status}`
      await supabase.from('eracun_konfiguracija')
        .update({ greska_zadnja: greska, updated_at: new Date().toISOString() })
        .eq('id', config.id)
      return new Response(JSON.stringify({ ok: false, greska }), { status: 500 })
    }

    const inbox = await inboxResp.json()
    const dokumenti = inbox.Documents ?? inbox.documents ?? inbox.items ?? []
    log.push(`Inbox: ${dokumenti.length} dokumenata`)

    // 2. Za svaki dokument — preuzmi, spremi, potvrdi
    for (const dok of dokumenti) {
      // ElectronicID je integer (prema Postman kolekciji)
      const electronicId: number = dok.ElectronicID ?? dok.ElectronicId ?? dok.electronicId
      if (!electronicId) {
        log.push(`Preskačem dokument bez ElectronicID`)
        continue
      }
      const docIdStr = String(electronicId)

      // Provjeri duplikat
      const { count } = await supabase
        .from('racuni')
        .select('id', { count: 'exact' })
        .eq('eracun_document_id', docIdStr)
      if (count && count > 0) {
        log.push(`Preskačem ${docIdStr}`)
        continue
      }

      // Preuzmi dokument — POST /apis/v2/receive
      const docResp = await fetch(`${baseUrl}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...authBody, ElectronicID: electronicId }),
      })
      if (!docResp.ok) {
        log.push(`Greška ${docIdStr}: ${docResp.status}`)
        continue
      }

      const docData = await docResp.json()
      const encodedXml = docData.EncodedXml ?? docData.encodedXml ?? docData.xmlContent ?? docData.xml ?? ''
      if (!encodedXml) {
        log.push(`Nema XML za ${docIdStr}`)
        continue
      }

      // Parsiraj XML
      const xmlString = atob(encodedXml)
      const podaci = parsirajXML(xmlString)
      if (!podaci) {
        log.push(`Parse greška ${docIdStr}`)
        continue
      }

      // Generiraj interni broj
      const godina = podaci.datum_racuna.substring(0, 4)
      const { count: brCount } = await supabase
        .from('racuni')
        .select('id', { count: 'exact' })
        .like('interni_broj', `URA-${godina}-%`)
      const intBroj = `URA-${godina}-${String((brCount ?? 0) + 1).padStart(3, '0')}`

      // Spremi u bazu
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
        eracun_document_id: docIdStr,
        eracun_posrednik: config.posrednik,
        eracun_xml: encodedXml,
      })

      if (insertErr) {
        log.push(`Upis greška ${docIdStr}: ${insertErr.message}`)
        continue
      }

      // 3. Potvrdi preuzimanje — POST /apis/v2/UpdateDokumentProcessStatus
      await fetch(`${baseUrl}/UpdateDokumentProcessStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authBody,
          ElectronicId: electronicId,
          StatusId: STATUS_RECEIVING_CONFIRMED,
        }),
      }).catch((e) => log.push(`Status update failed za ${docIdStr}: ${e}`))

      uvezeno++
      log.push(`OK ${podaci.naziv_stranke} — ${podaci.iznos_ukupno} EUR`)
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
    const get = (tag: string, ns: string, context?: Element) =>
      (context ?? doc).getElementsByTagNameNS(ns, tag)[0]?.textContent?.trim() ?? ''

    const payable = parseFloat(get('PayableAmount', CBC) || '0')
    const issueDate = get('IssueDate', CBC)
    if (!issueDate || payable <= 0) return null

    // Dobavljač iz AccountingSupplierParty bloka
    const supplierParty = doc.getElementsByTagNameNS(CAC, 'AccountingSupplierParty')[0]
    let naziv = ''
    let oib = ''
    if (supplierParty) {
      naziv = get('RegistrationName', CBC, supplierParty) || get('Name', CBC, supplierParty)
      oib = get('CompanyID', CBC, supplierParty) || get('EndpointID', CBC, supplierParty)
    }
    if (!oib) oib = get('SupplierID', FINA)
    if (!naziv) naziv = `Dobavljač ${oib || 'nepoznat'}`

    return {
      br_racuna: get('SupplierInvoiceID', FINA) || get('ID', CBC),
      oib_stranke: oib,
      naziv_stranke: naziv,
      datum_racuna: issueDate,
      datum_dospieca: get('DueDate', CBC),
      iznos_ukupno: payable,
      iznos_bez_pdv: parseFloat(get('TaxExclusiveAmount', CBC) || '0') || (payable - parseFloat(get('TaxAmount', CBC) || '0')),
      iznos_pdv: parseFloat(get('TaxAmount', CBC) || '0'),
    }
  } catch { return null }
}
