export interface EracunPodaci {
  br_racuna:      string
  oib_stranke:    string
  naziv_stranke:  string
  datum_racuna:   string
  datum_dospieca: string
  iznos_ukupno:   number
  iznos_bez_pdv:  number
  iznos_pdv:      number
  valuta:         string
}

export function parsirajEracunXML(xmlString: string): EracunPodaci | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    const parseError = doc.querySelector('parsererror')
    if (parseError) throw new Error('Neispravan XML format')

    // Namespace-aware helper
    const getByNS = (tag: string, ns: string, context?: Element): string =>
      (context ?? doc).getElementsByTagNameNS(ns, tag)[0]?.textContent?.trim() ?? ''

    // Fallback: regex za slučaj da namespace ne radi (enkodiranje itd.)
    const getByRegex = (tag: string): string => {
      const re = new RegExp(`<[^>]*${tag}[^>]*>([^<]+)<`, 'g')
      const match = re.exec(xmlString)
      return match?.[1]?.trim() ?? ''
    }

    const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
    const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
    const FINA = 'http://fina.hr/eracun/erp/OutgoingInvoicesData/v3.2'

    // Datum — NS pa fallback
    let issueDate = getByNS('IssueDate', CBC) || getByRegex('IssueDate')
    issueDate = normDatum(issueDate)

    // Iznosi
    const payable = parseFloat(getByNS('PayableAmount', CBC) || getByRegex('PayableAmount') || '0')
    const taxExcl = parseFloat(getByNS('TaxExclusiveAmount', CBC) || getByRegex('TaxExclusiveAmount') || '0')
    const taxAmount = parseFloat(getByNS('TaxAmount', CBC) || getByRegex('TaxAmount') || '0')

    if (!issueDate || payable <= 0) return null

    // Dobavljač — mora biti iz AccountingSupplierParty, NE prvi u dokumentu
    let nazivStranke = ''
    let oibStranke = ''

    // Probaj namespace pristup
    const supplierParty = doc.getElementsByTagNameNS(CAC, 'AccountingSupplierParty')[0]
    if (supplierParty) {
      nazivStranke = getByNS('RegistrationName', CBC, supplierParty)
        || getByNS('Name', CBC, supplierParty)
      // OIB iz CompanyID ili EndpointID
      oibStranke = getByNS('CompanyID', CBC, supplierParty)
        || getByNS('EndpointID', CBC, supplierParty)
    }

    // Fallback: regex na AccountingSupplierParty blok
    if (!nazivStranke) {
      const supplierBlock = xmlString.match(/AccountingSupplierParty.*?AccountingCustomerParty/s)?.[0] ?? ''
      const nameMatch = supplierBlock.match(/RegistrationName[^>]*>([^<]+)/)
      nazivStranke = nameMatch?.[1]?.trim() ?? ''
      if (!nazivStranke) {
        const nameMatch2 = supplierBlock.match(/<cbc:Name[^>]*>([^<]+)/)
        nazivStranke = nameMatch2?.[1]?.trim() ?? ''
      }
    }

    // FINA wrapper SupplierID kao fallback za OIB
    if (!oibStranke) {
      oibStranke = getByNS('SupplierID', FINA) || getByRegex('SupplierID')
    }

    // Zadnji fallback za naziv
    if (!nazivStranke) {
      nazivStranke = `Dobavljač ${oibStranke || 'nepoznat'}`
    }

    // FINA wrapper za broj računa
    const brRacuna = getByNS('SupplierInvoiceID', FINA)
      || getByRegex('SupplierInvoiceID')
      || getByNS('ID', CBC)

    const valuta = getByNS('DocumentCurrencyCode', CBC) || getByRegex('DocumentCurrencyCode') || 'EUR'
    const dueDate = normDatum(getByNS('DueDate', CBC) || getByRegex('DueDate'))

    return {
      br_racuna:     brRacuna,
      oib_stranke:   oibStranke,
      naziv_stranke: nazivStranke,
      datum_racuna:  issueDate,
      datum_dospieca: dueDate,
      iznos_ukupno:  payable,
      iznos_bez_pdv: taxExcl > 0 ? taxExcl : payable - taxAmount,
      iznos_pdv:     taxAmount,
      valuta,
    }
  } catch (err) {
    console.error('eRačun parse greška:', err)
    return null
  }
}

function normDatum(d: string): string {
  if (!d) return ''
  d = d.trim()
  const m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  return ''
}

export async function parsirajEracunFajl(file: File): Promise<EracunPodaci | null> {
  const text = await file.text()
  return parsirajEracunXML(text)
}
