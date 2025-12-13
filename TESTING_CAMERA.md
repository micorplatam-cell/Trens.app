# 📸 GUÍA DE TESTING - FUNCIONALIDAD DE CÁMARA

## ✅ PASO 2 COMPLETADO: REBUILD DEL PROYECTO

El proyecto ha sido reconstruido exitosamente con las nuevas dependencias:

- ✅ Cache limpiado (`.expo` y `node_modules/.cache`)
- ✅ TypeScript compilado sin errores
- ✅ Servidor Expo corriendo en: `exp://10.0.0.36:8081`
- ✅ Paquetes actualizados a versiones compatibles

---

## 📱 PASO 3: PROBAR EN DISPOSITIVO FÍSICO

### ⚠️ IMPORTANTE: LA CÁMARA NO FUNCIONA EN SIMULADOR

Para probar la funcionalidad de cámara, **DEBES usar un dispositivo físico** (Android o iOS).

---

## 🚀 OPCIONES PARA PROBAR:

### **OPCIÓN A: EXPO GO (Recomendado para testing rápido)**

1. **Instalar Expo Go:**
   - **iOS:** [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - **Android:** [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Escanear QR Code:**
   - Abre la terminal donde está corriendo `npm start`
   - Escanea el QR code con:
     - **iOS:** App de Cámara nativa → Tap en notificación
     - **Android:** Expo Go app → Tap "Scan QR Code"

3. **Probar funcionalidad:**
   - Login en TRENS
   - Ir a módulo **GYM** (tab inferior)
   - Si no hay ejercicios: Agregar uno desde STRUCTURE
   - Tap "GUARDAR Y ENTRENAR"
   - En modo FOCUS: **Buscar botón rojo de cámara** (esquina inferior derecha de imagen)
   - Tap botón → Aceptar permisos de cámara
   - Probar FOTO y VIDEO

---

### **OPCIÓN B: DEVELOPMENT BUILD (Para features nativas avanzadas)**

Si Expo Go da problemas con la cámara (a veces pasa), crear un Development Build:

```bash
# Android
npx expo run:android

# iOS (requiere Mac con Xcode)
npx expo run:ios
```

---

## 🎯 FLUJO DE TESTING COMPLETO:

### 1. **PREPARACIÓN**

```bash
# El servidor ya está corriendo en tu terminal
# Si no: npm start
```

### 2. **EN EL DISPOSITIVO:**

**A. Login:**

- Abre la app en tu teléfono
- Login con tu cuenta de prueba

**B. Ir a módulo GYM:**

- Tap en tab "GYM" (inferior)

**C. Agregar ejercicio (si no hay ninguno):**

- Modo STRUCTURE se muestra automáticamente
- Tap "+ AGREGAR EJERCICIO"
- Seleccionar cualquier ejercicio del catálogo
- Tap "GUARDAR Y ENTRENAR →"

**D. Probar cámara:**

1. Estás en modo FOCUS (scroll vertical estilo TikTok)
2. Ves imagen hero del ejercicio (mitad superior)
3. **Botón rojo de cámara** en esquina inferior derecha de la imagen
4. Tap botón → Permisos de cámara (acepta)
5. Modal de cámara se abre con preview

**E. Modo FOTO:**

1. Asegúrate que esté seleccionado "FOTO" (rojo)
2. Apunta a algo (máquina, pared, lo que sea)
3. Tap botón circular blanco
4. Flash visual → "PROCESANDO..."
5. Modal se cierra automáticamente
6. **Verifica:** La imagen del ejercicio ahora es tu foto

**F. Modo VIDEO:**

1. Tap botón cámara de nuevo
2. Seleccionar "VIDEO"
3. Tap botón circular rojo
4. Contador inicia: "0s / 10s"
5. Graba algo (movimientos, máquina, etc.)
6. Tap cuadrado rojo para STOP (o espera 10s)
7. "PROCESANDO..."
8. Modal se cierra
9. **Verifica:** La imagen del ejercicio ahora es tu video

---

## 🔍 QUÉ VERIFICAR:

### ✅ Checklist de Testing:

- [ ] Botón de cámara es visible (rojo, esquina inferior derecha)
- [ ] Tap botón → Solicita permisos de cámara (primera vez)
- [ ] Permisos aceptados → Modal se abre con preview
- [ ] Preview de cámara muestra lo que apunta la cámara trasera
- [ ] Toggle FOTO/VIDEO funciona (cambia botón de captura)
- [ ] **FOTO:**
  - [ ] Tap botón blanco → Vibración + flash visual
  - [ ] "PROCESANDO..." aparece
  - [ ] Modal se cierra automáticamente
  - [ ] Imagen del ejercicio se actualiza
- [ ] **VIDEO:**
  - [ ] Tap botón rojo → Contador inicia (0-10s)
  - [ ] Contador visible: "Xs / 10s"
  - [ ] Botón cambia a cuadrado rojo (STOP)
  - [ ] Tap STOP o espera 10s → Para grabación
  - [ ] "PROCESANDO..." aparece
  - [ ] Modal se cierra automáticamente
  - [ ] Video reemplaza imagen anterior
- [ ] Capturar otra foto/video → **Elimina** la anterior (no acumula)
- [ ] Cerrar modal con X → No captura nada

---

## 🐛 TROUBLESHOOTING:

### Error: "Permission denied"

**Solución:**

1. Ir a Ajustes del teléfono
2. Apps → Expo Go (o tu app)
3. Permisos → Cámara → Permitir

### Error: "Bucket not found"

**Solución:**
Ejecutar migración SQL en Supabase:

```sql
-- Ir a Supabase Dashboard → SQL Editor
-- Copiar y ejecutar: supabase/migrations/003_create_exercise_media_bucket.sql
```

### Preview de cámara aparece negro

**Causa:** Simulador no tiene cámara

**Solución:** Usar dispositivo físico

### Video no se reproduce

**Nota:** En modo FOCUS, el video es un thumbnail estático (por ahora). La funcionalidad completa de reproducción está en el módulo HISTORIAL.

### "PROCESANDO..." se queda pegado

**Solución:**

1. Cerrar modal
2. Verificar conexión a internet
3. Verificar que Supabase Storage esté configurado
4. Check console logs: `npx expo logs`

---

## 📊 LOGS Y DEBUGGING:

### Ver logs en tiempo real:

```bash
# Terminal adicional
npx expo logs
```

### Logs importantes a buscar:

```
✅ "Camera permission granted"
✅ "Photo captured"
✅ "Video recorded"
✅ "Uploading to Supabase..."
✅ "Upload successful"
❌ "💥 Error capturing photo"
❌ "💥 Error uploading media"
```

---

## 📸 RESULTADO ESPERADO:

### Antes (imagen placeholder):

```
┌─────────────────┐
│   PRESS BANCA   │
│  [Imagen genérica│
│   de ejercicio]  │
│         [📸] ←   │
└─────────────────┘
```

### Después (tu foto/video):

```
┌─────────────────┐
│   PRESS BANCA   │
│  [TU MÁQUINA    │
│   DEL GIMNASIO]  │
│         [📸] ←   │
└─────────────────┘
```

---

## ✨ FEATURES A PROBAR:

1. **Personalización por gimnasio:**
   - Cada ejercicio tiene su propia foto/video
   - Ideal para recordar ajustes de máquinas

2. **Reemplazo automático:**
   - Capturar 2 veces → Solo queda la última
   - No acumula espacio en Storage

3. **Compresión automática:**
   - Fotos se comprimen a 1080px
   - Mantiene calidad visual, reduce tamaño

4. **Feedback háptico:**
   - Vibración al abrir cámara
   - Vibración al capturar
   - Vibración al completar

---

## 🎬 DEMO SUGERIDA:

1. **Agregar 3 ejercicios:**
   - Press Banca
   - Sentadilla
   - Peso Muerto

2. **Capturar foto en cada uno:**
   - Press: Foto de la máquina de press
   - Sentadilla: Foto del rack
   - Peso: Foto de la barra

3. **Scroll vertical entre ejercicios:**
   - Ver que cada uno tiene su propia imagen
   - Ver que el botón de cámara está siempre visible

4. **Reemplazar una foto con video:**
   - Tap cámara en Press Banca
   - Cambiar a VIDEO
   - Grabar 5 segundos
   - Ver que reemplaza la foto anterior

---

## 🚀 SIGUIENTES PASOS (OPCIONAL):

Si todo funciona, puedes probar:

- [ ] Capturar en diferentes ejercicios
- [ ] Probar límite de 10s en video
- [ ] Verificar que se ve en modo STRUCTURE
- [ ] Compartir ejercicio con foto personalizada (PRO feature)

---

## 📱 DISPOSITIVOS COMPATIBLES:

- ✅ iOS 13+ (iPhone 6s o superior)
- ✅ Android 6.0+ (con cámara trasera)
- ❌ Simuladores (no tienen cámara física)

---

**SERVIDOR EXPO CORRIENDO EN:**

```
exp://10.0.0.36:8081
```

**ESCANEA EL QR CODE EN TU TERMINAL PARA EMPEZAR** 📱
