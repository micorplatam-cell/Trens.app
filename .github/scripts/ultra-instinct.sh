#!/bin/bash
# =============================================================================
# TRENS - ULTRA INSTINCT MODE 🔥
# Automatización extrema + AI-powered helpers
# =============================================================================

source /workspaces/Trens.app/.github/scripts/mega-power.sh 2>/dev/null

# =============================================================================
# 🤖 AI-POWERED COMMANDS
# =============================================================================

# Generar commit message inteligente basado en cambios
# Uso: smart-commit
smart-commit() {
  local changes=$(git diff --staged --stat | head -10)
  local files=$(git diff --staged --name-only | head -5 | tr '\n' ', ')
  
  echo -e "${CYAN}🤖 Analizando cambios...${NC}"
  echo "Archivos: $files"
  echo ""
  
  # Detectar tipo de cambio
  local type="chore"
  if echo "$files" | grep -q "feat\|feature\|add"; then type="feat"; fi
  if echo "$files" | grep -q "fix\|bug\|error"; then type="fix"; fi
  if echo "$files" | grep -q "doc\|readme\|md"; then type="docs"; fi
  if echo "$files" | grep -q "style\|css\|tailwind"; then type="style"; fi
  if echo "$files" | grep -q "test\|spec"; then type="test"; fi
  
  # Detectar scope
  local scope=""
  if echo "$files" | grep -q "spotify"; then scope="spotify"; fi
  if echo "$files" | grep -q "hank"; then scope="hank"; fi
  if echo "$files" | grep -q "gym"; then scope="gym"; fi
  if echo "$files" | grep -q "plan"; then scope="plan"; fi
  if echo "$files" | grep -q "adn"; then scope="adn"; fi
  
  local msg="$type"
  if [ -n "$scope" ]; then
    msg="$type($scope)"
  fi
  msg="$msg: $(date +%H:%M) auto-commit"
  
  echo -e "${YELLOW}📝 Mensaje sugerido: $msg${NC}"
  read -p "¿Usar este mensaje? [Y/n/custom]: " choice
  
  case "$choice" in
    n|N) echo "Cancelado"; return ;;
    "") git commit -m "$msg" ;;
    *) git commit -m "$choice" ;;
  esac
  
  echo -e "${GREEN}✅ Commit creado${NC}"
}

# =============================================================================
# 👁️ WATCHERS - Monitoreo en tiempo real
# =============================================================================

# Monitorear cambios y auto-reload
# Uso: watch-changes
watch-changes() {
  echo -e "${CYAN}👁️ Monitoreando cambios... (Ctrl+C para salir)${NC}"
  
  while true; do
    inotifywait -r -e modify,create,delete --exclude 'node_modules|\.git|\.expo' . 2>/dev/null
    echo -e "${YELLOW}📝 Cambio detectado: $(date +%H:%M:%S)${NC}"
    # Auto-lint on change
    npm run lint --silent 2>/dev/null &
  done
}

# Monitorear errores de TypeScript en tiempo real
watch-types() {
  echo -e "${CYAN}🔎 Monitoreando tipos TypeScript...${NC}"
  npx tsc --noEmit --watch --skipLibCheck
}

# =============================================================================
# 🔄 BACKGROUND PROCESSES
# =============================================================================

# Iniciar Expo en background
bg-expo() {
  echo -e "${CYAN}🚀 Iniciando Expo en background...${NC}"
  nohup npx expo start --tunnel > /tmp/expo.log 2>&1 &
  echo $! > /tmp/expo.pid
  echo -e "${GREEN}✅ Expo PID: $(cat /tmp/expo.pid)${NC}"
  echo -e "${CYAN}📋 Logs: tail -f /tmp/expo.log${NC}"
}

# Detener Expo background
bg-expo-stop() {
  if [ -f /tmp/expo.pid ]; then
    kill $(cat /tmp/expo.pid) 2>/dev/null
    rm /tmp/expo.pid
    echo -e "${RED}🛑 Expo detenido${NC}"
  else
    echo "No hay Expo en background"
  fi
}

# Ver logs de Expo background
bg-expo-logs() {
  tail -f /tmp/expo.log
}

# =============================================================================
# 🎯 QUICK ACTIONS - Comandos de una letra
# =============================================================================

# s = status
alias s='status'

# l = lint
alias l='npm run lint'

# t = type check
alias t='npx tsc --noEmit'

# r = run expo
alias r='npx expo start --tunnel'

# c = commit rápido
alias c='yolo'

# p = push
alias p='git push'

# d = diff
alias d='git diff --stat'

# =============================================================================
# 🧪 TESTING HELPERS
# =============================================================================

# Probar un componente específico
test-component() {
  local component="$1"
  echo -e "${CYAN}🧪 Buscando tests para: $component${NC}"
  find . -name "*$component*.test.*" -o -name "*$component*.spec.*" 2>/dev/null | grep -v node_modules
}

# Ejecutar tests
test-run() {
  npm test 2>/dev/null || echo "No hay tests configurados"
}

# =============================================================================
# 📊 ANALYTICS
# =============================================================================

# Análisis del proyecto
analyze() {
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo -e "${PURPLE}       📊 TRENS PROJECT ANALYSIS        ${NC}"
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo ""
  
  echo -e "${CYAN}📁 Estructura:${NC}"
  echo "  Componentes: $(find components -name "*.tsx" 2>/dev/null | wc -l)"
  echo "  Pantallas: $(find app -name "*.tsx" 2>/dev/null | wc -l)"
  echo "  Servicios: $(find services -name "*.ts" 2>/dev/null | wc -l)"
  echo "  Hooks: $(find hooks -name "*.ts" 2>/dev/null | wc -l)"
  echo ""
  
  echo -e "${CYAN}📊 Tamaño:${NC}"
  echo "  Líneas totales: $(find . \( -name "*.tsx" -o -name "*.ts" \) | grep -v node_modules | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
  echo "  Archivos TS/TSX: $(find . \( -name "*.tsx" -o -name "*.ts" \) | grep -v node_modules | wc -l)"
  echo ""
  
  echo -e "${CYAN}📦 Dependencias:${NC}"
  echo "  Producción: $(cat package.json | jq '.dependencies | length')"
  echo "  Desarrollo: $(cat package.json | jq '.devDependencies | length')"
  echo ""
  
  echo -e "${CYAN}🔥 Archivos más grandes:${NC}"
  find . \( -name "*.tsx" -o -name "*.ts" \) | grep -v node_modules | xargs wc -l 2>/dev/null | sort -rn | head -6 | tail -5
  echo ""
  
  echo -e "${CYAN}📅 Actividad reciente:${NC}"
  git log --oneline --since="1 week ago" | wc -l | xargs echo "  Commits última semana:"
  echo ""
}

# =============================================================================
# 🔐 SECRETS HELPER
# =============================================================================

# Ver variables de entorno (censuradas)
env-check() {
  echo -e "${CYAN}🔐 Variables de entorno configuradas:${NC}"
  echo ""
  [ -n "$EXPO_PUBLIC_SUPABASE_URL" ] && echo "  ✅ EXPO_PUBLIC_SUPABASE_URL"
  [ -n "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ] && echo "  ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY"
  [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && echo "  ✅ SUPABASE_SERVICE_ROLE_KEY"
  [ -n "$EXPO_TOKEN" ] && echo "  ✅ EXPO_TOKEN"
  [ -n "$EXPO_PUBLIC_GEMINI_API_KEY" ] && echo "  ✅ EXPO_PUBLIC_GEMINI_API_KEY"
  [ -n "$EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID" ] && echo "  ✅ EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID"
  echo ""
}

# =============================================================================
# 🚨 EMERGENCY COMMANDS
# =============================================================================

# Pánico: deshacer todo y volver al último commit
panic() {
  echo -e "${RED}🚨 PANIC MODE${NC}"
  read -p "¿Descartar TODOS los cambios no commiteados? [y/N]: " confirm
  if [ "$confirm" = "y" ]; then
    git checkout -- .
    git clean -fd
    echo -e "${GREEN}✅ Restaurado al último commit${NC}"
  fi
}

# Reset completo: volver a estado limpio
full-reset() {
  echo -e "${RED}💀 FULL RESET${NC}"
  read -p "¿Resetear TODO (node_modules, cache, cambios)? [y/N]: " confirm
  if [ "$confirm" = "y" ]; then
    git checkout -- .
    git clean -fd
    rm -rf node_modules .expo dist
    npm install
    echo -e "${GREEN}✅ Reset completo${NC}"
  fi
}

# =============================================================================
# 🎮 SHORTCUTS INTERACTIVOS
# =============================================================================

# Menú interactivo principal
menu() {
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo -e "${PURPLE}         🎮 TRENS QUICK MENU           ${NC}"
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo ""
  echo "  1) 🚀 Iniciar Expo (tunnel)"
  echo "  2) 📝 Commit rápido"
  echo "  3) 🔍 Lint & Fix"
  echo "  4) 📊 Analizar proyecto"
  echo "  5) 🔄 Sync con remote"
  echo "  6) 📱 Build preview"
  echo "  7) 🗄️ Ver tablas DB"
  echo "  8) 📋 GitHub status"
  echo "  9) 🔐 Check env vars"
  echo "  0) ❌ Salir"
  echo ""
  read -p "Elige opción: " choice
  
  case "$choice" in
    1) npx expo start --tunnel ;;
    2) yolo ;;
    3) npm run lint -- --fix ;;
    4) analyze ;;
    5) git-sync ;;
    6) expo-preview ;;
    7) db-tables ;;
    8) gh-status ;;
    9) env-check ;;
    0) return ;;
    *) echo "Opción no válida" ;;
  esac
}

# =============================================================================
# ULTRA INSTINCT LOADED
# =============================================================================
echo -e "${PURPLE}🔥 ULTRA INSTINCT MODE ACTIVATED 🔥${NC}"
echo -e "${CYAN}Comandos rápidos: s l t r c p d | menu | analyze${NC}"
