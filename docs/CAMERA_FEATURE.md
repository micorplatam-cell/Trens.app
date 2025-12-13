# 📸 FUNCIONALIDAD DE CÁMARA - MÓDULO GYM

## ✅ IMPLEMENTADO

Se ha agregado la funcionalidad completa de cámara al módulo GYM en modo FOCUS.

---

## 🎯 CARACTERÍSTICAS

### 1. **BOTÓN DE CÁMARA**

- **Ubicación:** Esquina inferior derecha de la imagen del ejercicio en modo FOCUS
- **Visual:** Botón circular rojo con icono de cámara blanco
- **Efecto:** Sombra neón roja + borde blanco
- **Acción:** Abre el modal de cámara con permisos automáticos

### 2. **MODAL DE CÁMARA**

#### Header:

- Título dinámico: "CAPTURAR" (foto) o "GRABAR" (video)
- Nombre del ejercicio actual
- Botón cerrar (X)

#### Vista de Cámara:

- Cámara trasera activa (facing="back")
- Preview fullscreen
- Indicador de grabación (contador 0-10s) con punto pulsante

#### Controles:

**Selector de Modo:**

- Toggle entre FOTO y VIDEO
- Diseño pill con iconos
- Modo activo: fondo rojo
- Modo inactivo: transparente con borde gris

**Botón de Captura:**

- **FOTO:** Círculo blanco (estilo iOS)
  - Tap → Captura foto + comprime a 1080px
- **VIDEO:** Círculo rojo
  - Tap → Inicia grabación (máximo 10 segundos)
  - Durante grabación: Botón cambia a cuadrado rojo (Stop)
  - Auto-stop a los 10 segundos

### 3. **PROCESAMIENTO**

- Overlay de carga con spinner rojo
- Texto: "PROCESANDO..."
- Bloquea interacción mientras sube

### 4. **LÓGICA DE ALMACENAMIENTO**

```typescript
// 1. Eliminar archivo anterior del ejercicio (si existe)
// 2. Leer nuevo archivo como base64
// 3. Convertir a ArrayBuffer
// 4. Subir a Supabase Storage: exercise-media bucket
// 5. Estructura: user_id/exercise_id/exercise_timestamp.jpg|mp4
// 6. Actualizar asset_url en user_assets
// 7. Actualizar estado local (imagen se actualiza en UI)
```

### 5. **FEEDBACK HÁPTICO**

- Al abrir cámara: `Medium`
- Al capturar foto: `Heavy`
- Al iniciar video: `Medium`
- Al completar: `Success`

---

## 📦 DEPENDENCIAS AGREGADAS

```json
"expo-camera": "latest",
"expo-av": "latest",
"expo-file-system": "latest",
"expo-image-manipulator": "latest"
```

**Instalación:**

```bash
npm install expo-camera expo-av expo-file-system expo-image-manipulator --legacy-peer-deps
```

---

## 🗄️ SUPABASE STORAGE

### Bucket: `exercise-media`

**Políticas RLS:**

1. ✅ INSERT: Usuarios autenticados pueden subir a su carpeta
2. ✅ UPDATE: Usuarios autenticados pueden actualizar sus archivos
3. ✅ DELETE: Usuarios autenticados pueden eliminar sus archivos
4. ✅ SELECT: Público puede ver archivos

**Aplicar migración:**

```bash
# Opción 1: Desde Supabase Dashboard
# Ir a SQL Editor → Pegar contenido de:
supabase/migrations/003_create_exercise_media_bucket.sql

# Opción 2: CLI (si usas Supabase CLI local)
supabase db push
```

**Estructura de carpetas:**

```
exercise-media/
├── user_abc123/
│   ├── exercise_001/
│   │   └── exercise_1702456789.jpg
│   ├── exercise_002/
│   │   └── exercise_1702456799.mp4
```

---

## 🎨 DISEÑO VISUAL

### Colores:

- Fondo modal: `#000000` (negro absoluto)
- Botón captura (foto): `#FFFFFF` (blanco)
- Botón captura (video): `#DC2626` (rojo savage)
- Overlay processing: `#000000/80`

### Animaciones:

- Indicador de grabación: punto blanco pulsante
- Processing: spinner rojo estándar
- Transición modal: slide de abajo hacia arriba

### Tipografía:

- Título: `text-lg font-bold tracking-wider`
- Subtítulo (ejercicio): `text-sm text-zinc-500`
- Contador: `text-lg font-bold font-mono`

---

## 🔥 FLUJO DE USUARIO

1. Usuario entrena en modo FOCUS
2. Ve imagen del ejercicio actual
3. Tap en botón cámara (esquina inferior derecha)
4. Se solicitan permisos (primera vez)
5. Modal de cámara se abre
6. Usuario elige: FOTO o VIDEO
7. **FOTO:**
   - Tap botón → Flash visual → Procesando → Cierra modal
   - Imagen actualizada se ve inmediatamente
8. **VIDEO:**
   - Tap botón → Inicia contador (0-10s)
   - Tap STOP o espera 10s → Procesando → Cierra modal
   - Video reemplaza imagen anterior

---

## ⚠️ NOTAS IMPORTANTES

### 1. **Reemplazo Automático**

- Cada nueva captura **elimina** el archivo anterior del storage
- Previene acumulación de archivos basura
- Mantiene 1 sola foto/video por ejercicio

### 2. **Compresión de Imágenes**

- Resize automático a 1080px de ancho
- Calidad 80% JPEG
- Reduce tamaño de archivo sin perder calidad visual

### 3. **Límite de Video**

- Máximo 10 segundos
- Auto-stop al llegar al límite
- Timer visible en pantalla

### 4. **Permisos**

- Solicita permiso de cámara al abrir por primera vez
- Si se deniega: muestra alert y no abre modal
- Re-solicita si el usuario cancela

### 5. **Cámara Trasera**

- Por defecto usa `facing="back"`
- Ideal para capturar máquinas del gym
- No hay toggle frontal/trasera (por simplicidad)

---

## 🚀 PRÓXIMAS MEJORAS (OPCIONAL)

- [ ] Toggle cámara frontal/trasera
- [ ] Zoom digital
- [ ] Flash toggle
- [ ] Grid de composición
- [ ] Filtros en tiempo real
- [ ] Edición post-captura (crop, rotate)
- [ ] Múltiples fotos (galería por ejercicio)

---

## 🐛 TROUBLESHOOTING

### Error: "Module expo-camera not found"

```bash
npm install expo-camera --legacy-peer-deps
npx expo prebuild --clean
```

### Error: "Permission denied"

- iOS: Agregar en `app.json`:

```json
"ios": {
  "infoPlist": {
    "NSCameraUsageDescription": "TRENS necesita acceso a la cámara para capturar tus ejercicios"
  }
}
```

- Android: Permisos automáticos

### Storage Error: "Bucket not found"

- Ejecutar migración SQL en Supabase Dashboard
- Verificar que el bucket `exercise-media` existe
- Verificar políticas RLS activas

---

## ✨ RESULTADO FINAL

El usuario ahora puede:

1. **Personalizar** cada ejercicio con la máquina específica de su gym
2. **Capturar** fotos de referencia para recordar ajustes de la máquina
3. **Grabar** videos cortos de la técnica correcta
4. **Ver** su propia imagen/video cada vez que entrena ese ejercicio
5. **No acumular** espacio innecesario (1 archivo por ejercicio)

---

**IMPLEMENTADO POR:** GitHub Copilot  
**FECHA:** 13 de Diciembre, 2025  
**VERSIÓN:** 1.0.0
