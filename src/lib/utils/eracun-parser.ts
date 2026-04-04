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

const FINA = 'http://fina.hr/eracun/erp/OutgoingInvoicesData/v3.2'
const CBC  = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
const CAC  = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'

export function parsirajEracunXML(xmlString: string): EracunPodaci | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    const parseError = doc.querySelector('parsererror')
    if (parseError) throw new Error('Neispravan XML format')

    const get = (tag: string, ns: string): string =>
      doc.getElementsByTagNameNS(ns, tag)[0]?.textContent?.trim() ?? ''

    const normDatum = (d: string): string => {
      if (!d) return ''
      const m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
      if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
      return d
    }

    const issueDate = normDatum(get('IssueDate', CBC))
    const payable   = parseFloat(get('PayableAmount', CBC) || '0')
    const taxExcl   = parseFloat(get('TaxExclusiveAmount', CBC) || '0')
    const taxAmount = parseFloat(get('TaxAmount', CBC) || '0')
    const naziv     = get('RegistrationName', CAC) || get('Name', CAC) || ''

    if (!issueDate || payable <= 0) return null

    return {
      br_racuna:     get('SupplierInvoiceID', FINA),
      oib_stranke:   get('SupplierID', FINA),
      naziv_stranke: naziv || `Dobavljač ${get('SupplierID', FINA)}`,
      datum_racuna:  issueDate,
      datum_dospieca: normDatum(get('DueDate', CBC)),
      iznos_ukupno:  payable,
      iznos_bez_pdv: taxExcl > 0 ? taxExcl : payable - taxAmount,
      iznos_pdv:     taxAmount,
      valuta:        get('DocumentCurrencyCode', CBC) || 'EUR',
    }
  } catch (err) {
    console.error('eRačun parse greška:', err)
    return null
  }
}

export async function parsirajEracunFajl(file: File): Promise<EracunPodaci | null> {
  const text = await file.text()
  return parsirajEracunXML(text)
}
