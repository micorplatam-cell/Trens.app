#!/bin/bash
# =============================================================================
# TRENS - MEGA POWER SCRIPTS
# El arsenal completo de automatización para Copilot
# =============================================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# 🗄️ SUPABASE HELPERS
# =============================================================================

# Ejecutar SQL directamente en Supabase
# Uso: db-sql "SELECT * FROM profiles LIMIT 5"
db-sql() {
  local query="$1"
  
  if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ EXPO_PUBLIC_SUPABASE_URL no configurada${NC}"
    return 1
  fi
  
  # Extraer project ref de la URL
  local project_ref=$(echo "$EXPO_PUBLIC_SUPABASE_URL" | sed 's|https://||' | sed 's|.supabase.co||')
  
  echo -e "${CYAN}🗄️ Ejecutando SQL...${NC}"
  curl -s -X POST \
    "${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY:-$EXPO_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-$EXPO_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$query\"}" | jq .
}

# Ejecutar archivo SQL
# Uso: db-file ./supabase/migrations/001_create_table.sql
db-file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo -e "${RED}❌ Archivo no encontrado: $file${NC}"
    return 1
  fi
  
  echo -e "${CYAN}🗄️ Ejecutando: $file${NC}"
  local query=$(cat "$file")
  db-sql "$query"
}

# Ver tablas
db-tables() {
  db-sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
}

# =============================================================================
# 📱 EXPO POWER COMMANDS
# =============================================================================

# Limpiar todo y reiniciar
expo-nuke() {
  echo -e "${YELLOW}💣 NUKING node_modules y cache...${NC}"
  rm -rf node_modules .expo dist
  npm cache clean --force
  npm install
  echo -e "${GREEN}✅ Limpio y reinstalado${NC}"
}

# Iniciar en modo túnel (para dispositivos físicos)
expo-tunnel() {
  echo -e "${CYAN}🚇 Iniciando Expo en modo túnel...${NC}"
  npx expo start --tunnel
}

# Build preview rápido
expo-preview() {
  echo -e "${PURPLE}🏗️ Creando build preview...${NC}"
  eas build --platform android --profile preview --non-interactive
}

# Actualización OTA
expo-update() {
  local message="${1:-Auto update from Copilot}"
  echo -e "${PURPLE}📡 Publicando actualización OTA...${NC}"
  eas update --auto --message "$message"
}

# =============================================================================
# 🔧 GIT POWER COMMANDS
# =============================================================================

# Commit + Push en un comando
# Uso: yolo "mensaje del commit"
yolo() {
  local msg="${1:-$(date +%Y-%m-%d_%H:%M) - Auto commit}"
  git add -A
  git commit -m "$msg"
  git push
  echo -e "${GREEN}✅ YOLO commit: $msg${NC}"
}

# Deshacer último commit (mantiene cambios)
git-undo() {
  git reset --soft HEAD~1
  echo -e "${YELLOW}↩️ Último commit deshecho (cambios preservados)${NC}"
}

# Stash rápido
git-stash() {
  git stash push -m "Auto stash $(date +%H:%M)"
  echo -e "${CYAN}📦 Cambios guardados en stash${NC}"
}

# Aplicar último stash
git-pop() {
  git stash pop
  echo -e "${CYAN}📦 Stash aplicado${NC}"
}

# Ver diff resumido
git-diff() {
  git diff --stat
}

# Sincronizar con remote
git-sync() {
  git fetch --all
  git pull --rebase
  echo -e "${GREEN}🔄 Sincronizado${NC}"
}

# =============================================================================
# 🚀 DEPLOYMENT COMMANDS
# =============================================================================

# Deploy completo: commit + push + build
deploy() {
  local msg="${1:-Deploy $(date +%Y-%m-%d_%H:%M)}"
  
  echo -e "${PURPLE}🚀 DEPLOY INICIADO${NC}"
  echo ""
  
  # 1. Commit y push
  yolo "$msg"
  
  # 2. Crear tag
  local version="v$(date +%Y%m%d.%H%M)"
  git tag "$version"
  git push origin "$version"
  
  echo -e "${GREEN}✅ Deploy completado: $version${NC}"
  echo -e "${CYAN}ℹ️  GitHub Actions iniciará el build automáticamente${NC}"
}

# =============================================================================
# 🛠️ DEV UTILITIES
# =============================================================================

# Buscar texto en todo el proyecto
# Uso: search "texto a buscar"
search() {
  grep -r --include="*.tsx" --include="*.ts" --include="*.js" "$1" . 2>/dev/null | grep -v node_modules | head -20
}

# Contar líneas de código
loc() {
  echo -e "${CYAN}📊 Líneas de código:${NC}"
  find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs wc -l | tail -1
}

# Ver últimos logs de Expo
logs() {
  tail -f ~/.expo/logs/*.log 2>/dev/null || echo "No hay logs disponibles"
}

# Matar proceso en puerto
# Uso: kill-port 8081
kill-port() {
  local port="$1"
  lsof -ti:$port | xargs kill -9 2>/dev/null
  echo -e "${RED}💀 Puerto $port liberado${NC}"
}

# Ver puertos en uso
ports() {
  lsof -i -P -n | grep LISTEN | grep -E ":(8081|19000|19001|19002|3000|5432)" 
}

# =============================================================================
# 📋 STATUS COMMANDS
# =============================================================================

# Estado completo del proyecto
status() {
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo -e "${PURPLE}        🔥 TRENS STATUS 🔥             ${NC}"
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo ""
  
  echo -e "${CYAN}📁 Branch:${NC} $(git branch --show-current)"
  echo -e "${CYAN}📝 Cambios:${NC} $(git status --porcelain | wc -l) archivos modificados"
  echo -e "${CYAN}📦 Deps:${NC} $(cat package.json | jq '.dependencies | length') dependencias"
  echo ""
  
  echo -e "${YELLOW}🌐 Puertos activos:${NC}"
  ports 2>/dev/null || echo "  Ninguno"
  echo ""
  
  echo -e "${YELLOW}📋 Últimos commits:${NC}"
  git log --oneline -5
  echo ""
}

# Help de todos los comandos
trens-help() {
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo -e "${PURPLE}     🔥 TRENS MEGA POWER COMMANDS 🔥    ${NC}"
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo ""
  echo -e "${CYAN}🗄️ DATABASE:${NC}"
  echo "  db-sql \"query\"     - Ejecutar SQL directo"
  echo "  db-file archivo    - Ejecutar archivo SQL"
  echo "  db-tables          - Listar tablas"
  echo ""
  echo -e "${CYAN}📱 EXPO:${NC}"
  echo "  expo-nuke          - Limpiar y reinstalar todo"
  echo "  expo-tunnel        - Iniciar en modo túnel"
  echo "  expo-preview       - Build preview Android"
  echo "  expo-update \"msg\"  - Publicar OTA update"
  echo ""
  echo -e "${CYAN}🔧 GIT:${NC}"
  echo "  yolo \"msg\"         - Commit + Push rápido"
  echo "  git-undo           - Deshacer último commit"
  echo "  git-stash/git-pop  - Guardar/restaurar cambios"
  echo "  git-sync           - Sincronizar con remote"
  echo ""
  echo -e "${CYAN}🚀 DEPLOY:${NC}"
  echo "  deploy \"msg\"       - Commit + Push + Tag + Build"
  echo ""
  echo -e "${CYAN}🛠️ UTILS:${NC}"
  echo "  search \"texto\"     - Buscar en código"
  echo "  loc                - Contar líneas de código"
  echo "  kill-port 8081     - Matar proceso en puerto"
  echo "  ports              - Ver puertos activos"
  echo "  status             - Estado del proyecto"
  echo ""
  echo -e "${CYAN}📋 GITHUB:${NC}"
  echo "  gh-pr \"titulo\"     - Crear PR"
  echo "  gh-issue \"titulo\"  - Crear issue"
  echo "  gh-merge           - Merge PR actual"
  echo "  gh-release \"v1.0\"  - Crear release"
  echo "  gh-status          - Estado del repo"
  echo ""
}

# =============================================================================
# AUTO-LOAD MESSAGE
# =============================================================================
echo -e "${GREEN}⚡ TRENS MEGA POWER LOADED ⚡${NC}"
echo -e "${CYAN}Escribe 'trens-help' para ver todos los comandos${NC}"
