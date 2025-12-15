# 🛡️ Sistema de Validación Automática

Este proyecto tiene configurado un sistema de validación automática para prevenir errores de TypeScript en commits y push.

## 🔧 Herramientas Configuradas

### 1️⃣ **Git Hooks (Husky)**

Se ejecutan automáticamente en tu máquina local:

#### Pre-commit Hook

- **Se ejecuta:** Antes de cada `git commit`
- **Valida:** Type-check de TypeScript
- **Previene:** Commits con errores de tipos

#### Pre-push Hook

- **Se ejecuta:** Antes de cada `git push`
- **Valida:** Type-check de TypeScript
- **Previene:** Push con código que no compila

### 2️⃣ **GitHub Actions (CI/CD)**

Se ejecuta en GitHub después de push:

- **Archivo:** `.github/workflows/type-check.yml`
- **Se ejecuta:** En cada push y pull request
- **Valida:** Type-check completo
- **Resultado:** ✅ o ❌ visible en GitHub

## 🚀 Cómo Funciona

### Flujo Normal

```bash
# 1. Haces cambios en el código
vim app/(tabs)/gym/index.tsx

# 2. Agregas archivos
git add .

# 3. Intentas hacer commit
git commit -m "mi commit"
# 🔍 Se ejecuta automáticamente: npm run type-check
# ✅ Si pasa: commit exitoso
# ❌ Si falla: commit bloqueado con error descriptivo

# 4. Intentas hacer push
git push origin main
# 🔍 Se ejecuta automáticamente: npm run type-check
# ✅ Si pasa: push exitoso
# ❌ Si falla: push bloqueado
```

### Si Type-Check Falla

```bash
❌ ERROR: Type-check falló. Por favor corrige los errores de TypeScript antes de hacer commit.

# Ver errores específicos:
npm run type-check

# Corregir errores y volver a intentar
```

## 🛠️ Comandos Útiles

```bash
# Ejecutar type-check manualmente
npm run type-check

# Ejecutar linter
npm run lint

# Auto-corregir problemas de lint
npm run lint:fix

# Saltar validación (NO RECOMENDADO)
git commit --no-verify -m "mensaje"
git push --no-verify
```

## ⚙️ Configuración

### Deshabilitar temporalmente

Si necesitas desactivar temporalmente los hooks:

```bash
# Método 1: Variable de entorno (una vez)
HUSKY=0 git commit -m "mensaje"

# Método 2: No verificar (una vez)
git commit --no-verify -m "mensaje"
```

### Deshabilitar permanentemente (NO RECOMENDADO)

```bash
# Eliminar hooks
rm -rf .husky

# O comentar el script prepare en package.json
# "prepare": "husky"
```

## 📋 Checklist Antes de Commit

- [ ] ✅ Código compila sin errores (`npm run type-check`)
- [ ] ✅ Sin errores de lint (`npm run lint`)
- [ ] ✅ Código testeado localmente
- [ ] ✅ Cambios relacionados en un solo commit
- [ ] ✅ Mensaje de commit descriptivo

## 🎯 Beneficios

1. **Prevención:** Detecta errores ANTES de subirlos a GitHub
2. **Calidad:** Mantiene el código con alta calidad de tipos
3. **Ahorro de tiempo:** Evita ciclos de "push → error → fix → push"
4. **CI/CD limpio:** Menos fallos en GitHub Actions
5. **Confianza:** Cada push es exitoso

## 🔄 Actualizar Husky

```bash
npm install --save-dev husky@latest
npm run prepare
```

## ❓ Troubleshooting

### Hook no se ejecuta

```bash
# Reinstalar hooks
npm run prepare
chmod +x .husky/*
```

### Hooks se ejecutan en CI

```bash
# Agregar en .github/workflows antes de npm ci:
- run: npm pkg delete scripts.prepare
```

## 📚 Más Información

- [Husky Documentation](https://typicode.github.io/husky/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [GitHub Actions](https://docs.github.com/en/actions)
