export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      aktivnosti_plan_rada: {
        Row: {
          created_at: string | null
          godina: number
          id: string
          kategorija: string
          napomena: string | null
          naziv: string
          odgovoran: string | null
          rok: string | null
          rok_datum: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          godina: number
          id?: string
          kategorija: string
          napomena?: string | null
          naziv: string
          odgovoran?: string | null
          rok?: string | null
          rok_datum?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          godina?: number
          id?: string
          kategorija?: string
          napomena?: string | null
          naziv?: string
          odgovoran?: string | null
          rok?: string | null
          rok_datum?: string | null
          status?: string
        }
        Relationships: []
      }
      bank_transakcije: {
        Row: {
          created_at: string | null
          datum: string
          id: string
          iznos: number
          izvor: string | null
          opis: string | null
          racun_id: string | null
          referenca: string | null
          status: string
          tip: string
        }
        Insert: {
          created_at?: string | null
          datum: string
          id?: string
          iznos: number
          izvor?: string | null
          opis?: string | null
          racun_id?: string | null
          referenca?: string | null
          status?: string
          tip: string
        }
        Update: {
          created_at?: string | null
          datum?: string
          id?: string
          iznos?: number
          izvor?: string | null
          opis?: string | null
          racun_id?: string | null
          referenca?: string | null
          status?: string
          tip?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transakcije_racun_id_fkey"
            columns: ["racun_id"]
            isOneToOne: false
            referencedRelation: "racuni"
            referencedColumns: ["id"]
          },
        ]
      }
      certifikati_osposobljavanje: {
        Row: {
          broj_certifikata: string | null
          clan_id: string
          created_at: string | null
          datum_isteka: string | null
          datum_stjecanja: string
          id: string
          napomena: string | null
          naziv: string
          organizator: string | null
          vrsta: string
        }
        Insert: {
          broj_certifikata?: string | null
          clan_id: string
          created_at?: string | null
          datum_isteka?: string | null
          datum_stjecanja: string
          id?: string
          napomena?: string | null
          naziv: string
          organizator?: string | null
          vrsta: string
        }
        Update: {
          broj_certifikata?: string | null
          clan_id?: string
          created_at?: string | null
          datum_isteka?: string | null
          datum_stjecanja?: string
          id?: string
          napomena?: string | null
          naziv?: string
          organizator?: string | null
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifikati_osposobljavanje_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
        ]
      }
      clanarine: {
        Row: {
          clan_id: string
          created_at: string | null
          datum_placanja: string | null
          godina: number
          id: string
          iznos: number | null
          nacin_placanja: string | null
          napomena: string | null
        }
        Insert: {
          clan_id: string
          created_at?: string | null
          datum_placanja?: string | null
          godina: number
          id?: string
          iznos?: number | null
          nacin_placanja?: string | null
          napomena?: string | null
        }
        Update: {
          clan_id?: string
          created_at?: string | null
          datum_placanja?: string | null
          godina?: number
          id?: string
          iznos?: number | null
          nacin_placanja?: string | null
          napomena?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clanarine_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
        ]
      }
      clanovi: {
        Row: {
          created_at: string | null
          datum_promjene_statusa: string | null
          datum_rodenja: string | null
          datum_stjecanja_zvanja: string | null
          datum_uclanivanja: string
          email: string | null
          gdpr_privola_datum: string | null
          gdpr_privola_verzija: string | null
          id: string
          ime: string
          kategorija: Database["public"]["Enums"]["kategorija_clana"]
          kucni_broj: string | null
          mjesto: string | null
          mjesto_rodenja: string | null
          mobitel: string | null
          oib: string
          postanski_broj: string | null
          prezime: string
          razlog_promjene: string | null
          status: Database["public"]["Enums"]["status_clana"]
          ulica: string | null
          updated_at: string | null
          updated_by: string | null
          vatrogasno_zvanje: string | null
        }
        Insert: {
          created_at?: string | null
          datum_promjene_statusa?: string | null
          datum_rodenja?: string | null
          datum_stjecanja_zvanja?: string | null
          datum_uclanivanja: string
          email?: string | null
          gdpr_privola_datum?: string | null
          gdpr_privola_verzija?: string | null
          id?: string
          ime: string
          kategorija: Database["public"]["Enums"]["kategorija_clana"]
          kucni_broj?: string | null
          mjesto?: string | null
          mjesto_rodenja?: string | null
          mobitel?: string | null
          oib: string
          postanski_broj?: string | null
          prezime: string
          razlog_promjene?: string | null
          status?: Database["public"]["Enums"]["status_clana"]
          ulica?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vatrogasno_zvanje?: string | null
        }
        Update: {
          created_at?: string | null
          datum_promjene_statusa?: string | null
          datum_rodenja?: string | null
          datum_stjecanja_zvanja?: string | null
          datum_uclanivanja?: string
          email?: string | null
          gdpr_privola_datum?: string | null
          gdpr_privola_verzija?: string | null
          id?: string
          ime?: string
          kategorija?: Database["public"]["Enums"]["kategorija_clana"]
          kucni_broj?: string | null
          mjesto?: string | null
          mjesto_rodenja?: string | null
          mobitel?: string | null
          oib?: string
          postanski_broj?: string | null
          prezime?: string
          razlog_promjene?: string | null
          status?: Database["public"]["Enums"]["status_clana"]
          ulica?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vatrogasno_zvanje?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clanovi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
        ]
      }
      dobavljaci_kategorije: {
        Row: {
          id: string
          naziv_stranke: string
          plan_stavka_id: string | null
          racunski_konto: string | null
          zadnji_put: string | null
          zadnji_racun_id: string | null
        }
        Insert: {
          id?: string
          naziv_stranke: string
          plan_stavka_id?: string | null
          racunski_konto?: string | null
          zadnji_put?: string | null
          zadnji_racun_id?: string | null
        }
        Update: {
          id?: string
          naziv_stranke?: string
          plan_stavka_id?: string | null
          racunski_konto?: string | null
          zadnji_put?: string | null
          zadnji_racun_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dobavljaci_kategorije_plan_stavka_id_fkey"
            columns: ["plan_stavka_id"]
            isOneToOne: false
            referencedRelation: "financijski_plan_stavke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dobavljaci_kategorije_zadnji_racun_id_fkey"
            columns: ["zadnji_racun_id"]
            isOneToOne: false
            referencedRelation: "racuni"
            referencedColumns: ["id"]
          },
        ]
      }
      dokumenti: {
        Row: {
          clan_id: string | null
          created_at: string | null
          id: string
          klasa: string | null
          modul: string | null
          nabava_id: string | null
          naziv: string
          opis: string | null
          racun_id: string | null
          rok_cuvanja: string | null
          sjednica_id: string | null
          storage_path: string
          uploaded_by: string | null
          urbroj: string | null
          velicina_kb: number | null
          vrsta: string | null
        }
        Insert: {
          clan_id?: string | null
          created_at?: string | null
          id?: string
          klasa?: string | null
          modul?: string | null
          nabava_id?: string | null
          naziv: string
          opis?: string | null
          racun_id?: string | null
          rok_cuvanja?: string | null
          sjednica_id?: string | null
          storage_path: string
          uploaded_by?: string | null
          urbroj?: string | null
          velicina_kb?: number | null
          vrsta?: string | null
        }
        Update: {
          clan_id?: string | null
          created_at?: string | null
          id?: string
          klasa?: string | null
          modul?: string | null
          nabava_id?: string | null
          naziv?: string
          opis?: string | null
          racun_id?: string | null
          rok_cuvanja?: string | null
          sjednica_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
          urbroj?: string | null
          velicina_kb?: number | null
          vrsta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dokumenti_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dokumenti_nabava_fk"
            columns: ["nabava_id"]
            isOneToOne: false
            referencedRelation: "nabave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dokumenti_sjednica_id_fkey"
            columns: ["sjednica_id"]
            isOneToOne: false
            referencedRelation: "sjednice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dokumenti_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
        ]
      }
      dvd_organizacija: {
        Row: {
          adresa: string | null
          banka: string | null
          boja_akcentna: string | null
          created_at: string | null
          datum_osnivanja: string | null
          email: string | null
          hvz_region: string | null
          iban: string | null
          id: string
          knjig_prag: string
          logo_url: string | null
          maticni_broj: string | null
          mjesto: string | null
          naziv: string
          naziv_kratki: string
          oib: string
          postanski_broj: string | null
          rbr_rno: string | null
          telefon: string | null
          updated_at: string | null
          vatrogasna_zajednica: string | null
          web: string | null
          zupanijska_zajednica: string | null
        }
        Insert: {
          adresa?: string | null
          banka?: string | null
          boja_akcentna?: string | null
          created_at?: string | null
          datum_osnivanja?: string | null
          email?: string | null
          hvz_region?: string | null
          iban?: string | null
          id?: string
          knjig_prag?: string
          logo_url?: string | null
          maticni_broj?: string | null
          mjesto?: string | null
          naziv?: string
          naziv_kratki?: string
          oib?: string
          postanski_broj?: string | null
          rbr_rno?: string | null
          telefon?: string | null
          updated_at?: string | null
          vatrogasna_zajednica?: string | null
          web?: string | null
          zupanijska_zajednica?: string | null
        }
        Update: {
          adresa?: string | null
          banka?: string | null
          boja_akcentna?: string | null
          created_at?: string | null
          datum_osnivanja?: string | null
          email?: string | null
          hvz_region?: string | null
          iban?: string | null
          id?: string
          knjig_prag?: string
          logo_url?: string | null
          maticni_broj?: string | null
          mjesto?: string | null
          naziv?: string
          naziv_kratki?: string
          oib?: string
          postanski_broj?: string | null
          rbr_rno?: string | null
          telefon?: string | null
          updated_at?: string | null
          vatrogasna_zajednica?: string | null
          web?: string | null
          zupanijska_zajednica?: string | null
        }
        Relationships: []
      }
      email_logovi: {
        Row: {
          created_at: string | null
          greska: string | null
          id: string
          predmet: string
          primatelj: string
          status: string | null
          tip: string
        }
        Insert: {
          created_at?: string | null
          greska?: string | null
          id?: string
          predmet: string
          primatelj: string
          status?: string | null
          tip: string
        }
        Update: {
          created_at?: string | null
          greska?: string | null
          id?: string
          predmet?: string
          primatelj?: string
          status?: string | null
          tip?: string
        }
        Relationships: []
      }
      eracun_konfiguracija: {
        Row: {
          aktivan: boolean | null
          api_key: string | null
          api_password: string
          api_username: string
          company_id: string
          created_at: string | null
          greska_zadnja: string | null
          id: string
          posrednik: string
          updated_at: string | null
          zadnji_sync: string | null
          zadnji_sync_br: number | null
        }
        Insert: {
          aktivan?: boolean | null
          api_key?: string | null
          api_password?: string
          api_username?: string
          company_id?: string
          created_at?: string | null
          greska_zadnja?: string | null
          id?: string
          posrednik?: string
          updated_at?: string | null
          zadnji_sync?: string | null
          zadnji_sync_br?: number | null
        }
        Update: {
          aktivan?: boolean | null
          api_key?: string | null
          api_password?: string
          api_username?: string
          company_id?: string
          created_at?: string | null
          greska_zadnja?: string | null
          id?: string
          posrednik?: string
          updated_at?: string | null
          zadnji_sync?: string | null
          zadnji_sync_br?: number | null
        }
        Relationships: []
      }
      financijski_plan_stavke: {
        Row: {
          id: string
          iznos_ostvareno: number
          iznos_plan: number
          kategorija: string
          napomena: string | null
          naziv_stavke: string
          plan_id: string
          racunski_plan_konto: string | null
          redni_broj: number | null
        }
        Insert: {
          id?: string
          iznos_ostvareno?: number
          iznos_plan?: number
          kategorija: string
          napomena?: string | null
          naziv_stavke: string
          plan_id: string
          racunski_plan_konto?: string | null
          redni_broj?: number | null
        }
        Update: {
          id?: string
          iznos_ostvareno?: number
          iznos_plan?: number
          kategorija?: string
          napomena?: string | null
          naziv_stavke?: string
          plan_id?: string
          racunski_plan_konto?: string | null
          redni_broj?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financijski_plan_stavke_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "financijski_planovi"
            referencedColumns: ["id"]
          },
        ]
      }
      financijski_planovi: {
        Row: {
          created_at: string | null
          datum_usvajanja: string | null
          godina: number
          id: string
          napomena: string | null
          sjednica_id: string | null
          status: string
          verzija: string
        }
        Insert: {
          created_at?: string | null
          datum_usvajanja?: string | null
          godina: number
          id?: string
          napomena?: string | null
          sjednica_id?: string | null
          status?: string
          verzija?: string
        }
        Update: {
          created_at?: string | null
          datum_usvajanja?: string | null
          godina?: number
          id?: string
          napomena?: string | null
          sjednica_id?: string | null
          status?: string
          verzija?: string
        }
        Relationships: [
          {
            foreignKeyName: "financijski_planovi_sjednica_id_fkey"
            columns: ["sjednica_id"]
            isOneToOne: false
            referencedRelation: "sjednice"
            referencedColumns: ["id"]
          },
        ]
      }
      imovina: {
        Row: {
          created_at: string | null
          datum_nabave: string | null
          datum_otpisa: string | null
          dobavljac: string | null
          godina_izrade: number | null
          id: string
          inventurni_broj: string | null
          lokacija: string | null
          marka: string | null
          model: string | null
          nabava_id: string | null
          nabavna_vrijednost: number | null
          naziv: string
          opis: string | null
          osiguranje_do: string | null
          osiguranje_polica: string | null
          razlog_otpisa: string | null
          reg_oznaka: string | null
          registracija_do: string | null
          serijski_broj: string | null
          status: string | null
          tehnicki_do: string | null
          updated_at: string | null
          vrsta: string
        }
        Insert: {
          created_at?: string | null
          datum_nabave?: string | null
          datum_otpisa?: string | null
          dobavljac?: string | null
          godina_izrade?: number | null
          id?: string
          inventurni_broj?: string | null
          lokacija?: string | null
          marka?: string | null
          model?: string | null
          nabava_id?: string | null
          nabavna_vrijednost?: number | null
          naziv: string
          opis?: string | null
          osiguranje_do?: string | null
          osiguranje_polica?: string | null
          razlog_otpisa?: string | null
          reg_oznaka?: string | null
          registracija_do?: string | null
          serijski_broj?: string | null
          status?: string | null
          tehnicki_do?: string | null
          updated_at?: string | null
          vrsta: string
        }
        Update: {
          created_at?: string | null
          datum_nabave?: string | null
          datum_otpisa?: string | null
          dobavljac?: string | null
          godina_izrade?: number | null
          id?: string
          inventurni_broj?: string | null
          lokacija?: string | null
          marka?: string | null
          model?: string | null
          nabava_id?: string | null
          nabavna_vrijednost?: number | null
          naziv?: string
          opis?: string | null
          osiguranje_do?: string | null
          osiguranje_polica?: string | null
          razlog_otpisa?: string | null
          reg_oznaka?: string | null
          registracija_do?: string | null
          serijski_broj?: string | null
          status?: string | null
          tehnicki_do?: string | null
          updated_at?: string | null
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovina_nabava_id_fkey"
            columns: ["nabava_id"]
            isOneToOne: false
            referencedRelation: "nabave"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencije: {
        Row: {
          adresa: string | null
          created_at: string | null
          datum_dojave: string
          detaljan_opis: string | null
          hvz_broj: string | null
          id: string
          interni_broj: string | null
          kratki_opis: string | null
          lat: number | null
          lng: number | null
          materijalna_steta: string | null
          nacin_dojave: string | null
          opcina: string | null
          ozljede: string | null
          sat_dojave: string | null
          sat_dolaska: string | null
          sat_polaska: string | null
          sat_zavrsetka: string | null
          upisao_id: string | null
          uzrok: string | null
          voditelj_id: string | null
          vrsta: string
        }
        Insert: {
          adresa?: string | null
          created_at?: string | null
          datum_dojave: string
          detaljan_opis?: string | null
          hvz_broj?: string | null
          id?: string
          interni_broj?: string | null
          kratki_opis?: string | null
          lat?: number | null
          lng?: number | null
          materijalna_steta?: string | null
          nacin_dojave?: string | null
          opcina?: string | null
          ozljede?: string | null
          sat_dojave?: string | null
          sat_dolaska?: string | null
          sat_polaska?: string | null
          sat_zavrsetka?: string | null
          upisao_id?: string | null
          uzrok?: string | null
          voditelj_id?: string | null
          vrsta: string
        }
        Update: {
          adresa?: string | null
          created_at?: string | null
          datum_dojave?: string
          detaljan_opis?: string | null
          hvz_broj?: string | null
          id?: string
          interni_broj?: string | null
          kratki_opis?: string | null
          lat?: number | null
          lng?: number | null
          materijalna_steta?: string | null
          nacin_dojave?: string | null
          opcina?: string | null
          ozljede?: string | null
          sat_dojave?: string | null
          sat_dolaska?: string | null
          sat_polaska?: string | null
          sat_zavrsetka?: string | null
          upisao_id?: string | null
          uzrok?: string | null
          voditelj_id?: string | null
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervencije_upisao_id_fkey"
            columns: ["upisao_id"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencije_voditelj_id_fkey"
            columns: ["voditelj_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencije_sudionici: {
        Row: {
          clan_id: string
          created_at: string | null
          id: string
          intervencija_id: string
          uloga: string | null
        }
        Insert: {
          clan_id: string
          created_at?: string | null
          id?: string
          intervencija_id: string
          uloga?: string | null
        }
        Update: {
          clan_id?: string
          created_at?: string | null
          id?: string
          intervencija_id?: string
          uloga?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervencije_sudionici_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervencije_sudionici_intervencija_id_fkey"
            columns: ["intervencija_id"]
            isOneToOne: false
            referencedRelation: "intervencije"
            referencedColumns: ["id"]
          },
        ]
      }
      korisnici: {
        Row: {
          aktivan: boolean | null
          created_at: string | null
          email: string
          id: string
          ime: string
          prezime: string
          uloga: Database["public"]["Enums"]["uloga_tip"]
          updated_at: string | null
        }
        Insert: {
          aktivan?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          ime: string
          prezime: string
          uloga?: Database["public"]["Enums"]["uloga_tip"]
          updated_at?: string | null
        }
        Update: {
          aktivan?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          ime?: string
          prezime?: string
          uloga?: Database["public"]["Enums"]["uloga_tip"]
          updated_at?: string | null
        }
        Relationships: []
      }
      nabave: {
        Row: {
          broj_nabave: string
          broj_ponuda: number | null
          created_at: string | null
          created_by: string | null
          datum_isporuke: string | null
          datum_narudzbenice: string | null
          datum_odobrenja: string | null
          datum_zahtjeva: string | null
          dobavljac_iban: string | null
          dobavljac_naziv: string | null
          dobavljac_oib: string | null
          id: string
          napomena: string | null
          odobrio_id: string | null
          opis: string
          procijenjeni_iznos: number | null
          status: string
          stvarni_iznos: number | null
        }
        Insert: {
          broj_nabave: string
          broj_ponuda?: number | null
          created_at?: string | null
          created_by?: string | null
          datum_isporuke?: string | null
          datum_narudzbenice?: string | null
          datum_odobrenja?: string | null
          datum_zahtjeva?: string | null
          dobavljac_iban?: string | null
          dobavljac_naziv?: string | null
          dobavljac_oib?: string | null
          id?: string
          napomena?: string | null
          odobrio_id?: string | null
          opis: string
          procijenjeni_iznos?: number | null
          status?: string
          stvarni_iznos?: number | null
        }
        Update: {
          broj_nabave?: string
          broj_ponuda?: number | null
          created_at?: string | null
          created_by?: string | null
          datum_isporuke?: string | null
          datum_narudzbenice?: string | null
          datum_odobrenja?: string | null
          datum_zahtjeva?: string | null
          dobavljac_iban?: string | null
          dobavljac_naziv?: string | null
          dobavljac_oib?: string | null
          id?: string
          napomena?: string | null
          odobrio_id?: string | null
          opis?: string
          procijenjeni_iznos?: number | null
          status?: string
          stvarni_iznos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nabave_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nabave_odobrio_id_fkey"
            columns: ["odobrio_id"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
        ]
      }
      odlikovanja: {
        Row: {
          broj_odluke: string | null
          clan_id: string
          created_at: string | null
          datum_dodjele: string
          dodijelio: string | null
          dokument_url: string | null
          id: string
          napomena: string | null
          naziv: string
          vrsta: string
        }
        Insert: {
          broj_odluke?: string | null
          clan_id: string
          created_at?: string | null
          datum_dodjele: string
          dodijelio?: string | null
          dokument_url?: string | null
          id?: string
          napomena?: string | null
          naziv: string
          vrsta: string
        }
        Update: {
          broj_odluke?: string | null
          clan_id?: string
          created_at?: string | null
          datum_dodjele?: string
          dodijelio?: string | null
          dokument_url?: string | null
          id?: string
          napomena?: string | null
          naziv?: string
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "odlikovanja_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
        ]
      }
      ponude: {
        Row: {
          created_at: string | null
          dobavljac_naziv: string
          dokument_id: string | null
          id: string
          iznos: number | null
          nabava_id: string
          napomena: string | null
          odabrana: boolean | null
          rok_isporuke: string | null
        }
        Insert: {
          created_at?: string | null
          dobavljac_naziv: string
          dokument_id?: string | null
          id?: string
          iznos?: number | null
          nabava_id: string
          napomena?: string | null
          odabrana?: boolean | null
          rok_isporuke?: string | null
        }
        Update: {
          created_at?: string | null
          dobavljac_naziv?: string
          dokument_id?: string | null
          id?: string
          iznos?: number | null
          nabava_id?: string
          napomena?: string | null
          odabrana?: boolean | null
          rok_isporuke?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponude_dokument_id_fkey"
            columns: ["dokument_id"]
            isOneToOne: false
            referencedRelation: "dokumenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponude_nabava_id_fkey"
            columns: ["nabava_id"]
            isOneToOne: false
            referencedRelation: "nabave"
            referencedColumns: ["id"]
          },
        ]
      }
      povijest_zvanja: {
        Row: {
          broj_certifikata: string | null
          certifikat_url: string | null
          clan_id: string
          created_at: string | null
          datum_ispita: string | null
          datum_stjecanja: string
          id: string
          napomena: string | null
          rezultat_ispita: string | null
          zvanje_id: string
        }
        Insert: {
          broj_certifikata?: string | null
          certifikat_url?: string | null
          clan_id: string
          created_at?: string | null
          datum_ispita?: string | null
          datum_stjecanja: string
          id?: string
          napomena?: string | null
          rezultat_ispita?: string | null
          zvanje_id: string
        }
        Update: {
          broj_certifikata?: string | null
          certifikat_url?: string | null
          clan_id?: string
          created_at?: string | null
          datum_ispita?: string | null
          datum_stjecanja?: string
          id?: string
          napomena?: string | null
          rezultat_ispita?: string | null
          zvanje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "povijest_zvanja_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povijest_zvanja_zvanje_id_fkey"
            columns: ["zvanje_id"]
            isOneToOne: false
            referencedRelation: "vatrogasna_zvanja"
            referencedColumns: ["id"]
          },
        ]
      }
      predlosci_fin_plan: {
        Row: {
          aktivan: boolean | null
          created_at: string | null
          id: string
          kategorija: string
          konto: string
          nadredjeni_konto: string | null
          naziv_stavke: string
          redni_broj: number | null
          zadnji_iznos: number | null
        }
        Insert: {
          aktivan?: boolean | null
          created_at?: string | null
          id?: string
          kategorija: string
          konto: string
          nadredjeni_konto?: string | null
          naziv_stavke: string
          redni_broj?: number | null
          zadnji_iznos?: number | null
        }
        Update: {
          aktivan?: boolean | null
          created_at?: string | null
          id?: string
          kategorija?: string
          konto?: string
          nadredjeni_konto?: string | null
          naziv_stavke?: string
          redni_broj?: number | null
          zadnji_iznos?: number | null
        }
        Relationships: []
      }
      predlosci_plan_rada: {
        Row: {
          aktivan: boolean | null
          created_at: string | null
          id: string
          kategorija: string
          mjesec_rok: number | null
          naziv: string
          opis: string | null
          ponavljanje: string
          redni_broj: number | null
        }
        Insert: {
          aktivan?: boolean | null
          created_at?: string | null
          id?: string
          kategorija: string
          mjesec_rok?: number | null
          naziv: string
          opis?: string | null
          ponavljanje?: string
          redni_broj?: number | null
        }
        Update: {
          aktivan?: boolean | null
          created_at?: string | null
          id?: string
          kategorija?: string
          mjesec_rok?: number | null
          naziv?: string
          opis?: string | null
          ponavljanje?: string
          redni_broj?: number | null
        }
        Relationships: []
      }
      racuni: {
        Row: {
          broj_racuna: string | null
          created_at: string | null
          datum_dospijeća: string | null
          datum_odobravanja: string | null
          datum_placanja: string | null
          datum_racuna: string
          dobavljac_id: string | null
          dobavljac_naziv: string | null
          dokument_id: string | null
          eracun_document_id: string | null
          eracun_posrednik: string | null
          eracun_xml: string | null
          iban_stranke: string | null
          id: string
          interni_broj: string | null
          iznos_bez_pdv: number | null
          iznos_ukupno: number
          izvor: string
          nabava_id: string | null
          napomena: string | null
          naziv_stranke: string
          odobrio_id: string | null
          oib_stranke: string | null
          opis: string | null
          pdv_iznos: number | null
          plan_stavka_id: string | null
          poslano_knjigov_datum: string | null
          poslano_knjigov_id: string | null
          racunski_konto: string | null
          status: string
          vrsta: string
        }
        Insert: {
          broj_racuna?: string | null
          created_at?: string | null
          datum_dospijeća?: string | null
          datum_odobravanja?: string | null
          datum_placanja?: string | null
          datum_racuna: string
          dobavljac_id?: string | null
          dobavljac_naziv?: string | null
          dokument_id?: string | null
          eracun_document_id?: string | null
          eracun_posrednik?: string | null
          eracun_xml?: string | null
          iban_stranke?: string | null
          id?: string
          interni_broj?: string | null
          iznos_bez_pdv?: number | null
          iznos_ukupno: number
          izvor?: string
          nabava_id?: string | null
          napomena?: string | null
          naziv_stranke: string
          odobrio_id?: string | null
          oib_stranke?: string | null
          opis?: string | null
          pdv_iznos?: number | null
          plan_stavka_id?: string | null
          poslano_knjigov_datum?: string | null
          poslano_knjigov_id?: string | null
          racunski_konto?: string | null
          status?: string
          vrsta: string
        }
        Update: {
          broj_racuna?: string | null
          created_at?: string | null
          datum_dospijeća?: string | null
          datum_odobravanja?: string | null
          datum_placanja?: string | null
          datum_racuna?: string
          dobavljac_id?: string | null
          dobavljac_naziv?: string | null
          dokument_id?: string | null
          eracun_document_id?: string | null
          eracun_posrednik?: string | null
          eracun_xml?: string | null
          iban_stranke?: string | null
          id?: string
          interni_broj?: string | null
          iznos_bez_pdv?: number | null
          iznos_ukupno?: number
          izvor?: string
          nabava_id?: string | null
          napomena?: string | null
          naziv_stranke?: string
          odobrio_id?: string | null
          oib_stranke?: string | null
          opis?: string | null
          pdv_iznos?: number | null
          plan_stavka_id?: string | null
          poslano_knjigov_datum?: string | null
          poslano_knjigov_id?: string | null
          racunski_konto?: string | null
          status?: string
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "racuni_dobavljac_id_fkey"
            columns: ["dobavljac_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "racuni_dokument_id_fkey"
            columns: ["dokument_id"]
            isOneToOne: false
            referencedRelation: "dokumenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "racuni_nabava_fk"
            columns: ["nabava_id"]
            isOneToOne: false
            referencedRelation: "nabave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "racuni_odobrio_id_fkey"
            columns: ["odobrio_id"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "racuni_plan_stavka_id_fkey"
            columns: ["plan_stavka_id"]
            isOneToOne: false
            referencedRelation: "financijski_plan_stavke"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "racuni_poslano_knjigov_id_fkey"
            columns: ["poslano_knjigov_id"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
        ]
      }
      revizijski_trag: {
        Row: {
          akcija: string
          created_at: string | null
          id: string
          korisnik_id: string | null
          novi_podaci: Json | null
          stari_podaci: Json | null
          tablica: string
          zapis_id: string
        }
        Insert: {
          akcija: string
          created_at?: string | null
          id?: string
          korisnik_id?: string | null
          novi_podaci?: Json | null
          stari_podaci?: Json | null
          tablica: string
          zapis_id: string
        }
        Update: {
          akcija?: string
          created_at?: string | null
          id?: string
          korisnik_id?: string | null
          novi_podaci?: Json | null
          stari_podaci?: Json | null
          tablica?: string
          zapis_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revizijski_trag_korisnik_id_fkey"
            columns: ["korisnik_id"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
        ]
      }
      servisni_zapisi: {
        Row: {
          created_at: string | null
          datum: string
          id: string
          imovina_id: string
          iznos: number | null
          kilometraza: number | null
          napomena: string | null
          opis_radova: string
          serviser: string | null
          sljedeci_servis: string | null
        }
        Insert: {
          created_at?: string | null
          datum: string
          id?: string
          imovina_id: string
          iznos?: number | null
          kilometraza?: number | null
          napomena?: string | null
          opis_radova: string
          serviser?: string | null
          sljedeci_servis?: string | null
        }
        Update: {
          created_at?: string | null
          datum?: string
          id?: string
          imovina_id?: string
          iznos?: number | null
          kilometraza?: number | null
          napomena?: string | null
          opis_radova?: string
          serviser?: string | null
          sljedeci_servis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servisni_zapisi_imovina_id_fkey"
            columns: ["imovina_id"]
            isOneToOne: false
            referencedRelation: "imovina"
            referencedColumns: ["id"]
          },
        ]
      }
      sjednice: {
        Row: {
          created_at: string | null
          created_by: string | null
          datum: string
          id: string
          klasa: string | null
          kvorum_postignut: boolean | null
          mjesto: string | null
          napomena: string | null
          naziv: string
          predsjedavajuci_id: string | null
          prisutno_clanova: number | null
          sat_pocetka: string | null
          sat_zavrsetka: string | null
          status: Database["public"]["Enums"]["status_sjednice"]
          ukupno_clanova: number | null
          updated_at: string | null
          urbroj: string | null
          vrsta: Database["public"]["Enums"]["vrsta_sjednice"]
          zapisnicar_id: string | null
          zapisnik_dostavljen_datum: string | null
          zapisnik_potvrda_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          datum: string
          id?: string
          klasa?: string | null
          kvorum_postignut?: boolean | null
          mjesto?: string | null
          napomena?: string | null
          naziv: string
          predsjedavajuci_id?: string | null
          prisutno_clanova?: number | null
          sat_pocetka?: string | null
          sat_zavrsetka?: string | null
          status?: Database["public"]["Enums"]["status_sjednice"]
          ukupno_clanova?: number | null
          updated_at?: string | null
          urbroj?: string | null
          vrsta: Database["public"]["Enums"]["vrsta_sjednice"]
          zapisnicar_id?: string | null
          zapisnik_dostavljen_datum?: string | null
          zapisnik_potvrda_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          datum?: string
          id?: string
          klasa?: string | null
          kvorum_postignut?: boolean | null
          mjesto?: string | null
          napomena?: string | null
          naziv?: string
          predsjedavajuci_id?: string | null
          prisutno_clanova?: number | null
          sat_pocetka?: string | null
          sat_zavrsetka?: string | null
          status?: Database["public"]["Enums"]["status_sjednice"]
          ukupno_clanova?: number | null
          updated_at?: string | null
          urbroj?: string | null
          vrsta?: Database["public"]["Enums"]["vrsta_sjednice"]
          zapisnicar_id?: string | null
          zapisnik_dostavljen_datum?: string | null
          zapisnik_potvrda_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjednice_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjednice_predsjedavajuci_id_fkey"
            columns: ["predsjedavajuci_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjednice_zapisnicar_id_fkey"
            columns: ["zapisnicar_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
        ]
      }
      sjednice_prisutni: {
        Row: {
          clan_id: string
          created_at: string | null
          id: string
          prisutan: boolean | null
          punomos: boolean | null
          sjednica_id: string
        }
        Insert: {
          clan_id: string
          created_at?: string | null
          id?: string
          prisutan?: boolean | null
          punomos?: boolean | null
          sjednica_id: string
        }
        Update: {
          clan_id?: string
          created_at?: string | null
          id?: string
          prisutan?: boolean | null
          punomos?: boolean | null
          sjednica_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sjednice_prisutni_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjednice_prisutni_sjednica_id_fkey"
            columns: ["sjednica_id"]
            isOneToOne: false
            referencedRelation: "sjednice"
            referencedColumns: ["id"]
          },
        ]
      }
      tijela_dvd: {
        Row: {
          aktivan: boolean | null
          clan_id: string
          created_at: string | null
          datum_do: string | null
          datum_od: string
          funkcija: string
          id: string
          vrsta: string
        }
        Insert: {
          aktivan?: boolean | null
          clan_id: string
          created_at?: string | null
          datum_do?: string | null
          datum_od?: string
          funkcija?: string
          id?: string
          vrsta: string
        }
        Update: {
          aktivan?: boolean | null
          clan_id?: string
          created_at?: string | null
          datum_do?: string | null
          datum_od?: string
          funkcija?: string
          id?: string
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "tijela_dvd_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
        ]
      }
      tocke_dnevnog_reda: {
        Row: {
          created_at: string | null
          glasovi_protiv: number | null
          glasovi_uzdrzani: number | null
          glasovi_za: number | null
          id: string
          naziv: string
          odluka_tekst: string | null
          opis: string | null
          rasprava: string | null
          redni_broj: number
          sjednica_id: string
          usvojena: boolean | null
          vrsta: string | null
          zakljucak: string | null
        }
        Insert: {
          created_at?: string | null
          glasovi_protiv?: number | null
          glasovi_uzdrzani?: number | null
          glasovi_za?: number | null
          id?: string
          naziv: string
          odluka_tekst?: string | null
          opis?: string | null
          rasprava?: string | null
          redni_broj: number
          sjednica_id: string
          usvojena?: boolean | null
          vrsta?: string | null
          zakljucak?: string | null
        }
        Update: {
          created_at?: string | null
          glasovi_protiv?: number | null
          glasovi_uzdrzani?: number | null
          glasovi_za?: number | null
          id?: string
          naziv?: string
          odluka_tekst?: string | null
          opis?: string | null
          rasprava?: string | null
          redni_broj?: number
          sjednica_id?: string
          usvojena?: boolean | null
          vrsta?: string | null
          zakljucak?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tocke_dnevnog_reda_sjednica_id_fkey"
            columns: ["sjednica_id"]
            isOneToOne: false
            referencedRelation: "sjednice"
            referencedColumns: ["id"]
          },
        ]
      }
      vatrogasna_zvanja: {
        Row: {
          aktivan: boolean | null
          created_at: string | null
          id: string
          kategorija: string
          naziv: string
          oznaka_url: string | null
          razina: number
          uvjeti_ispit: boolean | null
          uvjeti_obrazovanje: string | null
          uvjeti_opis: string | null
          uvjeti_staz_mjeseci: number | null
        }
        Insert: {
          aktivan?: boolean | null
          created_at?: string | null
          id?: string
          kategorija: string
          naziv: string
          oznaka_url?: string | null
          razina: number
          uvjeti_ispit?: boolean | null
          uvjeti_obrazovanje?: string | null
          uvjeti_opis?: string | null
          uvjeti_staz_mjeseci?: number | null
        }
        Update: {
          aktivan?: boolean | null
          created_at?: string | null
          id?: string
          kategorija?: string
          naziv?: string
          oznaka_url?: string | null
          razina?: number
          uvjeti_ispit?: boolean | null
          uvjeti_obrazovanje?: string | null
          uvjeti_opis?: string | null
          uvjeti_staz_mjeseci?: number | null
        }
        Relationships: []
      }
      vjezbe: {
        Row: {
          created_at: string | null
          datum: string
          id: string
          lokacija: string | null
          napomene: string | null
          naziv: string
          opis: string | null
          trajanje_min: number | null
          voditelj_id: string | null
          vrsta: string | null
        }
        Insert: {
          created_at?: string | null
          datum: string
          id?: string
          lokacija?: string | null
          napomene?: string | null
          naziv: string
          opis?: string | null
          trajanje_min?: number | null
          voditelj_id?: string | null
          vrsta?: string | null
        }
        Update: {
          created_at?: string | null
          datum?: string
          id?: string
          lokacija?: string | null
          napomene?: string | null
          naziv?: string
          opis?: string | null
          trajanje_min?: number | null
          voditelj_id?: string | null
          vrsta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vjezbe_voditelj_id_fkey"
            columns: ["voditelj_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
        ]
      }
      vjezbe_sudionici: {
        Row: {
          clan_id: string
          id: string
          napomena: string | null
          prisutan: boolean | null
          vjezba_id: string
        }
        Insert: {
          clan_id: string
          id?: string
          napomena?: string | null
          prisutan?: boolean | null
          vjezba_id: string
        }
        Update: {
          clan_id?: string
          id?: string
          napomena?: string | null
          prisutan?: boolean | null
          vjezba_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vjezbe_sudionici_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vjezbe_sudionici_vjezba_id_fkey"
            columns: ["vjezba_id"]
            isOneToOne: false
            referencedRelation: "vjezbe"
            referencedColumns: ["id"]
          },
        ]
      }
      zakonska_izvjesca: {
        Row: {
          datum_predaje: string | null
          dokument_id: string | null
          godina: number
          id: string
          kvartal: number | null
          napomena: string | null
          naziv: string
          primatelj: string
          rok: string | null
          status: string
          vrsta: string
        }
        Insert: {
          datum_predaje?: string | null
          dokument_id?: string | null
          godina: number
          id?: string
          kvartal?: number | null
          napomena?: string | null
          naziv: string
          primatelj: string
          rok?: string | null
          status?: string
          vrsta: string
        }
        Update: {
          datum_predaje?: string | null
          dokument_id?: string | null
          godina?: number
          id?: string
          kvartal?: number | null
          napomena?: string | null
          naziv?: string
          primatelj?: string
          rok?: string | null
          status?: string
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "zakonska_izvjesca_dokument_id_fkey"
            columns: ["dokument_id"]
            isOneToOne: false
            referencedRelation: "dokumenti"
            referencedColumns: ["id"]
          },
        ]
      }
      zakonski_sadrzaj: {
        Row: {
          aktivan: boolean | null
          created_at: string | null
          id: string
          izvor_zakon: string | null
          kategorija: string
          naslov: string
          redni_broj: number | null
          rok_opis: string | null
          sadrzaj: string
          updated_at: string | null
          updated_by: string | null
          vaznost: string
        }
        Insert: {
          aktivan?: boolean | null
          created_at?: string | null
          id?: string
          izvor_zakon?: string | null
          kategorija: string
          naslov: string
          redni_broj?: number | null
          rok_opis?: string | null
          sadrzaj: string
          updated_at?: string | null
          updated_by?: string | null
          vaznost?: string
        }
        Update: {
          aktivan?: boolean | null
          created_at?: string | null
          id?: string
          izvor_zakon?: string | null
          kategorija?: string
          naslov?: string
          redni_broj?: number | null
          rok_opis?: string | null
          sadrzaj?: string
          updated_at?: string | null
          updated_by?: string | null
          vaznost?: string
        }
        Relationships: [
          {
            foreignKeyName: "zakonski_sadrzaj_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "korisnici"
            referencedColumns: ["id"]
          },
        ]
      }
      zdravstveni_pregledi: {
        Row: {
          clan_id: string
          created_at: string | null
          datum_pregleda: string
          datum_sljedeceg: string | null
          id: string
          lijecnik: string | null
          napomena: string | null
          rezultat: string | null
          ustanova: string | null
        }
        Insert: {
          clan_id: string
          created_at?: string | null
          datum_pregleda: string
          datum_sljedeceg?: string | null
          id?: string
          lijecnik?: string | null
          napomena?: string | null
          rezultat?: string | null
          ustanova?: string | null
        }
        Update: {
          clan_id?: string
          created_at?: string | null
          datum_pregleda?: string
          datum_sljedeceg?: string | null
          id?: string
          lijecnik?: string | null
          napomena?: string | null
          rezultat?: string | null
          ustanova?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zdravstveni_pregledi_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clanovi"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      knjiga_ulaznih_racuna: {
        Row: {
          created_at: string | null
          datum_likvidacije: string | null
          datum_placanja: string | null
          datum_racuna: string | null
          godina: number | null
          interni_broj: string | null
          iznos_ukupno: number | null
          kategorija_plana: string | null
          likvidirao_ime: string | null
          naziv_stranke: string | null
          opis: string | null
          racunski_konto: string | null
          redni_broj: number | null
          status: string | null
        }
        Relationships: []
      }
      trenutni_funkcioneri: {
        Row: {
          blagajnik: string | null
          naziv_kratki: string | null
          organizacija_id: string | null
          predsjednik: string | null
          predsjednik_email: string | null
          predsjednik_mobitel: string | null
          tajnik: string | null
          tajnik_email: string | null
          zamjenik_predsjednika: string | null
          zamjenik_zapovjednika: string | null
          zapovjednik: string | null
          zapovjednik_mobitel: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      je_aktivan_korisnik: { Args: never; Returns: boolean }
      je_financijska_uloga: { Args: never; Returns: boolean }
      je_upravljacka_uloga: { Args: never; Returns: boolean }
      kreiraj_godisnja_izvjesca: { Args: never; Returns: undefined }
      trenutna_uloga: {
        Args: never
        Returns: Database["public"]["Enums"]["uloga_tip"]
      }
    }
    Enums: {
      kategorija_clana:
        | "dobrovoljni_vatrogasac"
        | "prikljuceni"
        | "pocasni"
        | "podmladak"
      status_clana: "aktivan" | "neaktivan" | "istupio" | "iskljucen"
      status_sjednice:
        | "planirana"
        | "pozivnica_poslana"
        | "odrzana"
        | "zapisnik_potpisan"
        | "arhivirana"
      uloga_tip:
        | "admin"
        | "predsjednik"
        | "zamjenik"
        | "tajnik"
        | "blagajnik"
        | "zapovjednik"
        | "zamjenik_zapovjednika"
        | "clan"
      vrsta_sjednice:
        | "skupstina_redovna"
        | "skupstina_izborna"
        | "skupstina_izvanredna"
        | "skupstina_konstitutivna"
        | "upravni_odbor"
        | "zapovjednistvo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      kategorija_clana: [
        "dobrovoljni_vatrogasac",
        "prikljuceni",
        "pocasni",
        "podmladak",
      ],
      status_clana: ["aktivan", "neaktivan", "istupio", "iskljucen"],
      status_sjednice: [
        "planirana",
        "pozivnica_poslana",
        "odrzana",
        "zapisnik_potpisan",
        "arhivirana",
      ],
      uloga_tip: [
        "admin",
        "predsjednik",
        "zamjenik",
        "tajnik",
        "blagajnik",
        "zapovjednik",
        "zamjenik_zapovjednika",
        "clan",
      ],
      vrsta_sjednice: [
        "skupstina_redovna",
        "skupstina_izborna",
        "skupstina_izvanredna",
        "skupstina_konstitutivna",
        "upravni_odbor",
        "zapovjednistvo",
      ],
    },
  },
} as const
