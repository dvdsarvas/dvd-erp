#!/bin/bash
# ============================================================
# scripts/migrate-all.sh
# Pokretanje Supabase migracija na svim DVD projektima
#
# Korištenje: ./scripts/migrate-all.sh
# Preduvjet:  supabase CLI instaliran, projects.env popunjen
# ============================================================

set -e  # Zaustavi se na prvoj grešci

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS_FILE="$SCRIPT_DIR/projects.env"

# Provjeri postoji li projects.env
if [ ! -f "$PROJECTS_FILE" ]; then
  echo "❌ Greška: $PROJECTS_FILE ne postoji."
  echo "   Kopiraj projects.env.example u projects.env i popuni podake."
  exit 1
fi

# Učitaj popis projekata
source "$PROJECTS_FILE"

if [ ${#PROJECTS[@]} -eq 0 ]; then
  echo "❌ Greška: Nema projekata u projects.env"
  exit 1
fi

echo "======================================================"
echo "DVD ERP — Pokretanje migracija"
echo "Broj projekata: ${#PROJECTS[@]}"
echo "======================================================"
echo ""

USPJESNO=0
GRESKE=0

for project in "${PROJECTS[@]}"; do
  NAME=$(echo "$project" | cut -d'|' -f1)
  DB_URL=$(echo "$project" | cut -d'|' -f2)

  echo "→ $NAME"
  echo "  DB URL: ${DB_URL:0:50}..."

  if supabase db push --db-url "$DB_URL" 2>&1; then
    echo "  ✓ Uspješno"
    ((USPJESNO++))
  else
    echo "  ✗ Greška — preskačem, nastavljam s ostalima"
    ((GRESKE++))
  fi
  echo ""
done

echo "======================================================"
echo "Završeno: $USPJESNO uspješno, $GRESKE grešaka"
echo "======================================================"

if [ $GRESKE -gt 0 ]; then
  exit 1
fi
