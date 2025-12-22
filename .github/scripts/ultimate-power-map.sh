#!/bin/bash
# =============================================================================
# TRENS - ULTIMATE POWER MAP
# Mapa completo de TODOS los superpoderes disponibles
# =============================================================================

PURPLE='\033[0;35m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${PURPLE}"
cat << 'LOGO'
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║  ████████╗██████╗ ███████╗███╗   ██╗███████╗    ██████╗  ██████╗ ██╗    ██╗║
║  ╚══██╔══╝██╔══██╗██╔════╝████╗  ██║██╔════╝    ██╔══██╗██╔═══██╗██║    ██║║
║     ██║   ██████╔╝█████╗  ██╔██╗ ██║███████╗    ██████╔╝██║   ██║██║ █╗ ██║║
║     ██║   ██╔══██╗██╔══╝  ██║╚██╗██║╚════██║    ██╔═══╝ ██║   ██║██║███╗██║║
║     ██║   ██║  ██║███████╗██║ ╚████║███████║    ██║     ╚██████╔╝╚███╔███╔╝║
║     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝    ╚═╝      ╚═════╝  ╚══╝╚══╝ ║
║                                                                            ║
║                     U L T I M A T E   P O W E R   M A P                    ║
╚════════════════════════════════════════════════════════════════════════════╝
LOGO
echo -e "${NC}"

echo ""
echo -e "${RED}══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}                            🔱 LEVEL 4: GOD MODE                              ${NC}"
echo -e "${RED}══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}  god \"mensaje\"${NC}        → Full pipeline: lint + types + commit + push"
echo -e "${RED}  god-deploy \"msg\"${NC}     → God + crear PR automático"
echo -e "${RED}  g${NC}                    → Alias de 'god'"
echo -e "${RED}  gd${NC}                   → Alias de 'god-deploy'"
echo ""

echo -e "${PURPLE}══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}                         🔥 LEVEL 3: ULTRA INSTINCT                          ${NC}"
echo -e "${PURPLE}══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${PURPLE}  smart-commit \"msg\"${NC}   → AI-powered commit message generator"
echo -e "${PURPLE}  watch-changes${NC}        → Auto-commit cuando hay cambios guardados"
echo -e "${PURPLE}  watch-types${NC}          → TypeScript watcher en tiempo real"
echo -e "${PURPLE}  bg-expo${NC}              → Expo en background"
echo -e "${PURPLE}  bg-expo-stop${NC}         → Parar Expo background"
echo -e "${PURPLE}  bg-expo-logs${NC}         → Ver logs de Expo"
echo -e "${PURPLE}  menu${NC}                 → Menú interactivo"
echo -e "${PURPLE}  analyze${NC}              → Análisis completo del proyecto"
echo -e "${PURPLE}  panic${NC}                → Deshacer último commit"
echo -e "${PURPLE}  full-reset${NC}           → Reset total (peligroso)"
echo ""

echo -e "${CYAN}══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                          ⚡ LEVEL 2: MEGA POWER                             ${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}DATABASE:${NC}"
echo -e "    db-sql \"QUERY\"      → Ejecutar SQL en Supabase"
echo -e "    db-file archivo.sql → Ejecutar archivo SQL"
echo -e "    db-tables           → Ver todas las tablas"
echo ""
echo -e "  ${CYAN}EXPO:${NC}"
echo -e "    expo-nuke           → Destruir cache y reinstalar"
echo -e "    expo-tunnel         → Expo con tunnel"
echo -e "    expo-preview        → Crear preview build"
echo -e "    expo-update         → Publicar OTA"
echo ""
echo -e "  ${CYAN}GIT POWER:${NC}"
echo -e "    yolo \"mensaje\"      → Git add + commit + push en un comando"
echo -e "    git-undo            → Deshacer último commit (soft)"
echo -e "    git-stash           → Guardar cambios rápido"
echo -e "    git-sync            → Pull + Push"
echo ""
echo -e "  ${CYAN}DEPLOY:${NC}"
echo -e "    deploy              → Build Android + iOS"
echo ""
echo -e "  ${CYAN}UTILS:${NC}"
echo -e "    search \"query\"      → Buscar en código"
echo -e "    loc                 → Lines of code"
echo -e "    kill-port 8081      → Matar proceso en puerto"
echo -e "    ports               → Ver puertos activos"
echo -e "    status              → Estado del proyecto"
echo ""

echo -e "${GREEN}══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                          🐙 LEVEL 1: GITHUB CLI                             ${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "    gh-pr \"titulo\"      → Crear Pull Request"
echo -e "    gh-issue \"titulo\"   → Crear Issue"
echo -e "    gh-prs              → Ver PRs abiertos"
echo -e "    gh-issues           → Ver Issues abiertos"
echo -e "    gh-merge NUM        → Merge PR #NUM"
echo -e "    gh-release TAG      → Crear release"
echo -e "    gh-status           → Status del repo"
echo ""

echo -e "${BLUE}══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           ⌨️  ONE-LETTER ALIASES                             ${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "    ${BLUE}s${NC} → git status         ${BLUE}l${NC} → git log (5)         ${BLUE}t${NC} → npm test"
echo -e "    ${BLUE}r${NC} → npm run            ${BLUE}c${NC} → npm run lint        ${BLUE}p${NC} → git push"
echo -e "    ${BLUE}d${NC} → git diff           ${BLUE}f${NC} → fix \"msg\"           ${BLUE}w${NC} → wip"
echo -e "    ${BLUE}g${NC} → god                ${BLUE}q${NC} → qr"
echo ""

echo -e "${YELLOW}══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                          🧠 MCP SERVER (para Copilot)                       ${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${YELLOW}DATABASE TOOLS:${NC}"
echo -e "    db_query             → SELECT desde cualquier tabla"
echo -e "    db_insert            → INSERT datos"
echo -e "    db_update            → UPDATE datos"
echo -e "    db_delete            → DELETE datos"
echo -e "    db_rpc               → Ejecutar funciones Supabase"
echo -e "    db_tables            → Listar todas las tablas"
echo ""
echo -e "  ${YELLOW}GIT TOOLS:${NC}"
echo -e "    git_status           → Ver estado git"
echo -e "    git_commit           → Commitear cambios"
echo -e "    git_push             → Push al remote"
echo -e "    git_log              → Ver historial"
echo ""
echo -e "  ${YELLOW}PROJECT TOOLS:${NC}"
echo -e "    project_analyze      → Análisis completo"
echo -e "    find_component       → Buscar componentes"
echo -e "    run_command          → Ejecutar comandos shell"
echo ""

echo -e "${NC}══════════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}✅ Tips:${NC}"
echo -e "     - Usa ${CYAN}power${NC} para ver referencia rápida de God Mode"
echo -e "     - Usa ${CYAN}trens-help${NC} para ver Mega Power commands"
echo -e "     - Usa ${CYAN}menu${NC} para menú interactivo"
echo -e "     - Escribe ${CYAN}ultimate${NC} para volver a ver este mapa"
echo ""
echo -e "══════════════════════════════════════════════════════════════════════════════"
