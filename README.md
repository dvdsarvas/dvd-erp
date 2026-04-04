# DVD ERP

Sustav za digitalizaciju dokumentacije dobrovoljnih vatrogasnih drustava.
Pilot: DVD Sarvas.

## Stack

- React 18 + TypeScript + Vite
- Wouter (routing), Zustand (state), Tailwind CSS v4
- Supabase (auth, baza, storage, Edge Functions)
- framer-motion (animacije), recharts (grafovi), docx (dokumenti), xlsx (export)

## Pokretanje

```bash
npm install
npm run dev       # dev server
npm run build     # produkcijski build
```

## Moduli

- Dashboard s KPI grafovima i alarmima
- Evidencija clanstva (CRUD, certifikati, zdravstveni pregledi, clanarine)
- Sjednice (skupstine, UO, zapovjednistvo) s generiranjem dokumenata
- Financijski plan (plan vs ostvareno, automatski iz racuna)
- Racuni (workflow, e-Racun XML import, knjiga ulaznih, kategorizacija)
- Zakonska izvjesca, nabava, imovina, vatrogasna djelatnost
- Akcijski centar (proaktivna to-do lista)
- Pripremi skupstinu (6 dokumenata jednim klikom)
- Import bankovnih izvadaka (CSV parser)
- Postavke (korisnici, tijela, podaci DVD-a, zakonske obveze wiki, e-Racun config)

## Dokumentacija

- `CLAUDE.md` — upute za Claude Code
- `ANALIZA.md` — analiza stanja projekta
- `RAZVOJNI_PLAN_ROADMAP.md` — roadmap sprintova
- `dvd-erp-docs/` — arhitektura, baza, moduli, sigurnost, migracije
