#!/bin/bash
# =============================================================================
# TRENS - Scripts de GitHub CLI para Copilot
# Ubicación: .github/scripts/gh-helpers.sh
# =============================================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Crear un PR rápido
# Uso: gh-pr "título del PR" "descripción opcional"
# -----------------------------------------------------------------------------
gh-pr() {
  local title="${1:-Auto PR from Copilot}"
  local body="${2:-Cambios automáticos generados por Copilot}"
  
  echo -e "${YELLOW}📝 Creando PR...${NC}"
  
  # Asegurar que hay commits pendientes
  git add -A
  git commit -m "$title" 2>/dev/null || echo "No hay cambios para commit"
  
  # Push y crear PR
  git push -u origin HEAD
  gh pr create --title "$title" --body "$body" --fill
  
  echo -e "${GREEN}✅ PR creado${NC}"
}

# -----------------------------------------------------------------------------
# Crear un issue rápido
# Uso: gh-issue "título" "descripción"
# -----------------------------------------------------------------------------
gh-issue() {
  local title="${1:-Issue from Copilot}"
  local body="${2:-}"
  
  gh issue create --title "$title" --body "$body"
  echo -e "${GREEN}✅ Issue creado${NC}"
}

# -----------------------------------------------------------------------------
# Listar PRs abiertos
# -----------------------------------------------------------------------------
gh-prs() {
  gh pr list --limit 10
}

# -----------------------------------------------------------------------------
# Listar issues abiertos
# -----------------------------------------------------------------------------
gh-issues() {
  gh issue list --limit 10
}

# -----------------------------------------------------------------------------
# Merge PR actual
# -----------------------------------------------------------------------------
gh-merge() {
  gh pr merge --auto --squash
  echo -e "${GREEN}✅ PR mergeado${NC}"
}

# -----------------------------------------------------------------------------
# Crear release
# Uso: gh-release "v1.0.0" "Descripción del release"
# -----------------------------------------------------------------------------
gh-release() {
  local tag="${1:-v0.0.1}"
  local notes="${2:-Release automático}"
  
  git tag "$tag"
  git push origin "$tag"
  gh release create "$tag" --title "$tag" --notes "$notes"
  
  echo -e "${GREEN}✅ Release $tag creado${NC}"
}

# -----------------------------------------------------------------------------
# Status rápido
# -----------------------------------------------------------------------------
gh-status() {
  echo -e "${YELLOW}📊 Estado del repositorio${NC}"
  echo ""
  echo "🔀 Branch actual: $(git branch --show-current)"
  echo "📝 Commits pendientes: $(git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null | wc -l)"
  echo ""
  echo "📋 PRs abiertos:"
  gh pr list --limit 5
  echo ""
  echo "🐛 Issues abiertos:"
  gh issue list --limit 5
}

echo -e "${GREEN}✅ TRENS GitHub helpers cargados${NC}"
echo "Comandos disponibles: gh-pr, gh-issue, gh-prs, gh-issues, gh-merge, gh-release, gh-status"
