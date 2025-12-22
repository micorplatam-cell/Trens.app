#!/bin/bash
# =============================================================================
# TRENS EXTERNAL COMMUNICATION 📡
# Webhooks y notificaciones externas
# =============================================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# 📱 DISCORD WEBHOOK
# =============================================================================

# Configurar tu webhook de Discord aquí
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

# Enviar mensaje a Discord
# Uso: discord "mensaje" "titulo"
discord() {
  local message="$1"
  local title="${2:-TRENS Bot 🔥}"
  
  if [ -z "$DISCORD_WEBHOOK" ]; then
    echo -e "${YELLOW}⚠️ DISCORD_WEBHOOK_URL no configurado${NC}"
    echo "Configura: export DISCORD_WEBHOOK_URL='tu-webhook-url'"
    return 1
  fi
  
  curl -s -X POST "$DISCORD_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{
      \"embeds\": [{
        \"title\": \"$title\",
        \"description\": \"$message\",
        \"color\": 14423100,
        \"footer\": {\"text\": \"Enviado desde TRENS Codespace\"}
      }]
    }" > /dev/null
  
  echo -e "${GREEN}✅ Mensaje enviado a Discord${NC}"
}

# Notificar deploy a Discord
discord-deploy() {
  local msg="$1"
  local branch=$(git branch --show-current)
  local commit=$(git log --oneline -1)
  
  discord "**Branch:** $branch\n**Commit:** $commit\n**Mensaje:** $msg" "🚀 Deploy Notification"
}

# =============================================================================
# 📱 SLACK WEBHOOK
# =============================================================================

SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Enviar mensaje a Slack
slack() {
  local message="$1"
  
  if [ -z "$SLACK_WEBHOOK" ]; then
    echo -e "${YELLOW}⚠️ SLACK_WEBHOOK_URL no configurado${NC}"
    return 1
  fi
  
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"🔥 TRENS: $message\"}" > /dev/null
  
  echo -e "${GREEN}✅ Mensaje enviado a Slack${NC}"
}

# =============================================================================
# 📱 TELEGRAM BOT
# =============================================================================

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Enviar mensaje a Telegram
telegram() {
  local message="$1"
  
  if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo -e "${YELLOW}⚠️ TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados${NC}"
    return 1
  fi
  
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "text=🔥 TRENS: $message" \
    -d "parse_mode=Markdown" > /dev/null
  
  echo -e "${GREEN}✅ Mensaje enviado a Telegram${NC}"
}

# =============================================================================
# 📧 EMAIL (via Resend API)
# =============================================================================

RESEND_API_KEY="${RESEND_API_KEY:-}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

# Enviar email
send-email() {
  local subject="$1"
  local body="$2"
  
  if [ -z "$RESEND_API_KEY" ] || [ -z "$NOTIFY_EMAIL" ]; then
    echo -e "${YELLOW}⚠️ RESEND_API_KEY o NOTIFY_EMAIL no configurados${NC}"
    return 1
  fi
  
  curl -s -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"from\": \"TRENS Bot <trens@resend.dev>\",
      \"to\": \"$NOTIFY_EMAIL\",
      \"subject\": \"$subject\",
      \"text\": \"$body\"
    }" > /dev/null
  
  echo -e "${GREEN}✅ Email enviado a $NOTIFY_EMAIL${NC}"
}

# =============================================================================
# 🔔 NOTIFICAR A TODOS
# =============================================================================

# Notificar a todos los canales configurados
notify-all() {
  local message="$1"
  
  echo -e "${CYAN}📡 Enviando notificación a todos los canales...${NC}"
  
  [ -n "$DISCORD_WEBHOOK" ] && discord "$message"
  [ -n "$SLACK_WEBHOOK" ] && slack "$message"
  [ -n "$TELEGRAM_BOT_TOKEN" ] && telegram "$message"
  [ -n "$RESEND_API_KEY" ] && send-email "TRENS Notification" "$message"
  
  echo -e "${GREEN}✅ Notificaciones enviadas${NC}"
}

# =============================================================================
# 🚀 AUTO-NOTIFY ON DEPLOY
# =============================================================================

# Deploy con notificación automática
deploy-notify() {
  local msg="${1:-Deploy $(date +%H:%M)}"
  
  # God mode deploy
  god "$msg"
  
  # Notificar
  local branch=$(git branch --show-current)
  local commit=$(git log --oneline -1)
  notify-all "🚀 *Deploy completado*\n\nBranch: $branch\nCommit: $commit\nMensaje: $msg"
}

# =============================================================================
# 📊 GITHUB API HELPERS
# =============================================================================

# Crear issue desde terminal
gh-create-issue() {
  local title="$1"
  local body="${2:-Creado desde TRENS Codespace}"
  
  gh issue create --title "$title" --body "$body"
  echo -e "${GREEN}✅ Issue creado${NC}"
}

# Ver CI status
gh-ci-status() {
  gh run list --limit 5
}

# Trigger workflow manualmente
gh-trigger() {
  local workflow="${1:-ci.yml}"
  gh workflow run "$workflow"
  echo -e "${GREEN}✅ Workflow $workflow triggered${NC}"
}

# =============================================================================
# 🌐 API TESTING
# =============================================================================

# Test rápido de API
api-test() {
  local url="$1"
  local method="${2:-GET}"
  
  echo -e "${CYAN}🌐 Testing $method $url${NC}"
  curl -s -X "$method" "$url" | head -20
}

# Test Supabase connection
test-supabase() {
  source .env 2>/dev/null
  
  if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ EXPO_PUBLIC_SUPABASE_URL not set${NC}"
    return 1
  fi
  
  local response=$(curl -s "${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/" \
    -H "apikey: ${EXPO_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}")
  
  if echo "$response" | grep -q "swagger"; then
    echo -e "${GREEN}✅ Supabase conectado${NC}"
  else
    echo -e "${RED}❌ Error conectando a Supabase${NC}"
  fi
}

# =============================================================================
echo -e "${CYAN}📡 External Communication loaded${NC}"
echo "Comandos: discord, slack, telegram, send-email, notify-all, deploy-notify"
