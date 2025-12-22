#!/bin/bash
# =============================================================================
# TRENS - GOD MODE 🔱
# El nivel MÁXIMO de automatización
# =============================================================================

source /workspaces/Trens.app/.github/scripts/ultra-instinct.sh 2>/dev/null

# =============================================================================
# 🔱 GOD MODE COMMANDS - Control absoluto
# =============================================================================

# Ejecutar todo: lint, types, commit, push en un comando
# Uso: god "mensaje"
god() {
  local msg="${1:-$(date +%Y-%m-%d_%H:%M) - God mode commit}"
  
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo -e "${PURPLE}          🔱 GOD MODE ACTIVATED 🔱      ${NC}"
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo ""
  
  # 1. Lint fix
  echo -e "${CYAN}1/4 🔍 Linting...${NC}"
  npm run lint -- --fix 2>/dev/null || true
  
  # 2. Type check
  echo -e "${CYAN}2/4 📝 Type checking...${NC}"
  npx tsc --noEmit 2>/dev/null || echo "⚠️  Warnings (continuando)"
  
  # 3. Commit
  echo -e "${CYAN}3/4 💾 Committing...${NC}"
  git add -A
  git commit -m "$msg" 2>/dev/null || echo "Sin cambios para commit"
  
  # 4. Push
  echo -e "${CYAN}4/4 🚀 Pushing...${NC}"
  git push
  
  echo ""
  echo -e "${GREEN}✅ GOD MODE COMPLETE${NC}"
}

# Full deploy con PR automático
# Uso: god-deploy "feat: nueva feature"
god-deploy() {
  local msg="${1:-Auto deploy $(date +%Y-%m-%d_%H:%M)}"
  
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo -e "${PURPLE}       🔱 GOD DEPLOY MODE 🔱           ${NC}"
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo ""
  
  # God mode básico
  god "$msg"
  
  # Crear PR
  echo -e "${CYAN}📝 Creando PR...${NC}"
  gh pr create --title "$msg" --body "Automated deploy via God Mode" --fill 2>/dev/null || echo "PR existente o error"
  
  echo ""
  echo -e "${GREEN}✅ GOD DEPLOY COMPLETE${NC}"
}

# =============================================================================
# 🌐 LIVE RELOAD COMMANDS
# =============================================================================

# Iniciar todo en modo desarrollo
dev() {
  echo -e "${PURPLE}🚀 Iniciando entorno de desarrollo...${NC}"
  
  # Cargar .env
  source .env 2>/dev/null
  
  # Expo en modo túnel
  npx expo start --tunnel
}

# Hot reload de scripts (recargar configuración)
reload() {
  source ~/.bashrc
  source /workspaces/Trens.app/.github/scripts/god-mode.sh 2>/dev/null
  echo -e "${GREEN}✅ Scripts recargados${NC}"
}

# =============================================================================
# 📊 REAL-TIME MONITORING
# =============================================================================

# Dashboard en tiempo real
dashboard() {
  clear
  while true; do
    clear
    echo -e "${PURPLE}═══════════════════════════════════════${NC}"
    echo -e "${PURPLE}      🔥 TRENS LIVE DASHBOARD 🔥        ${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}⏰ $(date +%H:%M:%S)${NC}"
    echo ""
    echo -e "${YELLOW}📁 Git Status:${NC}"
    echo "  Branch: $(git branch --show-current)"
    echo "  Changes: $(git status --porcelain | wc -l) files"
    echo ""
    echo -e "${YELLOW}🌐 Ports:${NC}"
    lsof -i -P -n 2>/dev/null | grep LISTEN | grep -E ":(8081|19000|3000)" | head -3 || echo "  None active"
    echo ""
    echo -e "${YELLOW}💾 Memory:${NC}"
    free -h | grep Mem | awk '{print "  Used: " $3 " / " $2}'
    echo ""
    echo -e "${CYAN}Press Ctrl+C to exit${NC}"
    sleep 5
  done
}

# =============================================================================
# 🎯 INSTANT COMMANDS (super rápidos)
# =============================================================================

# Fix: arregla errores y commitea
fix() {
  local msg="${1:-fix: quick fix}"
  npm run lint -- --fix 2>/dev/null
  yolo "$msg"
}

# Feat: nueva feature y commitea
feat() {
  local msg="${1:-feat: new feature}"
  yolo "$msg"
}

# WIP: commit de trabajo en progreso
wip() {
  yolo "wip: work in progress"
}

# =============================================================================
# 🔥 NUCLEAR OPTIONS
# =============================================================================

# Destruir y reconstruir todo
nuke() {
  echo -e "${RED}💣 NUKE MODE${NC}"
  read -p "¿Destruir node_modules, cache y reinstalar? [y/N]: " confirm
  if [ "$confirm" = "y" ]; then
    rm -rf node_modules .expo dist package-lock.json
    npm cache clean --force
    npm install
    echo -e "${GREEN}✅ Reconstruido desde cero${NC}"
  fi
}

# Force push (peligroso)
force-push() {
  echo -e "${RED}⚠️ FORCE PUSH${NC}"
  read -p "¿Force push? Esto sobrescribirá el remote. [y/N]: " confirm
  if [ "$confirm" = "y" ]; then
    git push --force
    echo -e "${GREEN}✅ Force pushed${NC}"
  fi
}

# =============================================================================
# 📱 MOBILE COMMANDS
# =============================================================================

# QR code para conectar dispositivo
qr() {
  echo -e "${CYAN}📱 Iniciando Expo con QR...${NC}"
  npx expo start --tunnel --qr
}

# Build y deploy OTA
ota() {
  local msg="${1:-OTA update $(date +%H:%M)}"
  echo -e "${PURPLE}📡 Publicando OTA update...${NC}"
  eas update --auto --message "$msg"
  echo -e "${GREEN}✅ OTA publicado: $msg${NC}"
}

# =============================================================================
# 🧠 SMART COMMANDS
# =============================================================================

# Auto-detectar tipo de cambio y commitear
smart() {
  local files=$(git diff --staged --name-only 2>/dev/null || git diff --name-only)
  local type="chore"
  local scope=""
  
  # Detectar tipo
  if echo "$files" | grep -q "fix\|bug"; then type="fix"; fi
  if echo "$files" | grep -q "feat\|feature\|add"; then type="feat"; fi
  if echo "$files" | grep -q "doc\|readme"; then type="docs"; fi
  if echo "$files" | grep -q "test\|spec"; then type="test"; fi
  if echo "$files" | grep -q "style\|css"; then type="style"; fi
  
  # Detectar scope
  if echo "$files" | grep -q "spotify"; then scope="spotify"; fi
  if echo "$files" | grep -q "hank"; then scope="hank"; fi
  if echo "$files" | grep -q "gym"; then scope="gym"; fi
  if echo "$files" | grep -q "plan"; then scope="plan"; fi
  if echo "$files" | grep -q "adn"; then scope="adn"; fi
  if echo "$files" | grep -q "feed"; then scope="feed"; fi
  
  local msg="$type"
  [ -n "$scope" ] && msg="$type($scope)"
  msg="$msg: auto-commit $(date +%H:%M)"
  
  echo -e "${CYAN}🧠 Smart commit: $msg${NC}"
  yolo "$msg"
}

# =============================================================================
# 📋 QUICK REFERENCE
# =============================================================================

power() {
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo -e "${PURPLE}     🔱 TRENS GOD MODE REFERENCE 🔱     ${NC}"
  echo -e "${PURPLE}═══════════════════════════════════════${NC}"
  echo ""
  echo -e "${RED}🔱 GOD:${NC}"
  echo "  god \"msg\"         Full: lint+types+commit+push"
  echo "  god-deploy \"msg\"  Full + create PR"
  echo ""
  echo -e "${CYAN}⚡ INSTANT:${NC}"
  echo "  fix \"msg\"         Lint fix + commit"
  echo "  feat \"msg\"        Feature commit"
  echo "  wip               Work in progress commit"
  echo "  smart             Auto-detect + commit"
  echo ""
  echo -e "${YELLOW}📱 MOBILE:${NC}"
  echo "  dev               Start dev environment"
  echo "  qr                Expo with QR"
  echo "  ota \"msg\"         Publish OTA update"
  echo ""
  echo -e "${GREEN}📊 MONITOR:${NC}"
  echo "  dashboard         Live monitoring"
  echo "  reload            Reload scripts"
  echo ""
  echo -e "${RED}💣 NUCLEAR:${NC}"
  echo "  nuke              Destroy + rebuild"
  echo "  force-push        Force push (dangerous)"
  echo ""
}

# =============================================================================
# ALIAS ULTRA CORTOS
# =============================================================================

alias g='god'
alias gd='god-deploy'
alias f='fix'
alias w='wip'
alias q='qr'

# =============================================================================
# GOD MODE LOADED
# =============================================================================
echo -e "${RED}🔱 GOD MODE LOADED 🔱${NC}"
echo -e "${CYAN}Escribe 'power' para ver todos los comandos${NC}"
