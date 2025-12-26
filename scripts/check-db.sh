#!/bin/bash
# Script para ejecutar SQL en Supabase

# Cargar variables
export $(grep -v '^#' /workspaces/Trens.app/.env | grep -v '^$' | xargs)

echo "=== TRENS Database Migration ==="
echo "URL: $EXPO_PUBLIC_SUPABASE_URL"
echo ""

# Verificar si la tabla sports existe
RESULT=$(curl -s "${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/sports?select=code" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

echo "Sports table check: $RESULT"

if echo "$RESULT" | grep -q '"code"'; then
  echo "✅ Sports table exists with data!"
  echo "$RESULT"
else
  echo "⚠️ Sports table not found or empty"
  echo "Response: $RESULT"
  echo ""
  echo "Please run the migration manually at:"
  echo "https://supabase.com/dashboard/project/cnrcrhlrteeqsyhlxhbb/sql/new"
fi
