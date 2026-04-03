const DVD = 'DVD Sarvaš'
const POZDRAV = 'Vatru gasi – brata spasi!'

function wrapper(sadrzaj: string): string {
  return `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      ${sadrzaj}
      <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
      <p style="font-size: 12px; color: #999;">
        ${DVD} · Ivana Mažuranića 31, 31000 Sarvaš<br/>
        Ova poruka poslana je putem DVD ERP sustava.
      </p>
    </div>
  `
}

export function emailPozivnica(naziv: string, datum: string, mjesto?: string | null): string {
  return wrapper(`
    <p>Poštovani,</p>
    <p>u prilogu Vam šaljemo pozivnicu za <strong>${naziv}</strong>
    koja će se održati <strong>${datum}</strong>${mjesto ? ` u ${mjesto}` : ''}.</p>
    <p>Molimo Vas da svojom nazočnošću pomognete u radu.</p>
    <br/>
    <p><em>Uz vatrogasni pozdrav,</em></p>
    <p><strong><em>${POZDRAV}</em></strong></p>
    <p>${DVD}</p>
  `)
}

export function emailDnevniRed(naziv: string, datum: string): string {
  return wrapper(`
    <p>Poštovani,</p>
    <p>u prilogu Vam šaljemo dnevni red za <strong>${naziv}</strong>
    koja će se održati <strong>${datum}</strong>.</p>
    <p>Molimo Vas da se upoznate s materijalima prije sjednice.</p>
    <br/>
    <p>${DVD}</p>
  `)
}

export function emailZapisnik(naziv: string, datum: string): string {
  return wrapper(`
    <p>Poštovani,</p>
    <p>u prilogu Vam šaljemo zapisnik sa <strong>${naziv}</strong>
    održane <strong>${datum}</strong>.</p>
    <br/>
    <p>${DVD}</p>
  `)
}

export function emailPozivSjednice(naziv: string, datum: string, vrijeme: string, mjesto?: string | null): string {
  return wrapper(`
    <p>Poštovani,</p>
    <p>pozivamo Vas na <strong>${naziv}</strong> koja će se održati
    <strong>${datum}</strong> u <strong>${vrijeme}</strong> sati${mjesto ? ` u ${mjesto}` : ''}.</p>
    <p>U prilogu se nalazi poziv s dnevnim redom.</p>
    <p>Molim Vas da za točke dnevnog reda glasujete sa ZA ili PROTIV ili SUZDRŽAN
    elektronskim putem na e-mail adresu: <a href="mailto:dvdsarvas@gmail.com">dvdsarvas@gmail.com</a></p>
    <br/>
    <p>S poštovanjem,</p>
    <p>${DVD}</p>
  `)
}
