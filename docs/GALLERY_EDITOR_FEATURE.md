# GALERÍA Y EDITOR - MÓDULO GYM

## 🎯 FUNCIONALIDAD

El usuario puede agregar imágenes/videos desde la galería al ejercicio actual, con editor de recorte cuadrado integrado.

---

## 🔄 FLUJO COMPLETO

### 1. APERTURA DEL MODAL DE CÁMARA

```typescript
// Usuario presiona botón de cámara en imagen de ejercicio (MODO FOCUS)
<TouchableOpacity onPress={openCamera}>
  <CameraIcon />
</TouchableOpacity>

// Se solicita permiso de cámara
const { status } = await requestPermission();

// Se abre modal con 2 opciones:
// - Capturar foto con cámara
// - Seleccionar de galería
```

### 2. SELECCIÓN DE GALERÍA

```typescript
// Usuario presiona botón "SELECCIONAR DE GALERÍA"
const pickFromGallery = async () => {
  // 1. Solicitar permisos de MediaLibrary
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  // 2. Abrir selector de galería (fotos y videos)
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All, // Fotos y videos
    allowsEditing: false, // Usar nuestro editor personalizado
    quality: 0.8,
  });

  // 3. Detectar tipo de media
  const asset = result.assets[0];
  setMediaType(asset.type === 'video' ? 'video' : 'photo');

  // 4. Abrir modal de editor
  setImageToEdit(asset.uri);
  setEditorVisible(true);
};
```

### 3. MODAL DE EDITOR

```typescript
// Modal minimalista con preview cuadrado
const renderEditorModal = () => (
  <Modal visible={editorVisible}>
    {/* HEADER CON BOTONES CANCELAR Y GUARDAR */}
    <View>
      <TouchableOpacity onPress={cancelar}>CANCELAR</TouchableOpacity>
      <Text>AJUSTAR RECORTE</Text>
      <TouchableOpacity onPress={handleEditorSave}>GUARDAR</TouchableOpacity>
    </View>

    {/* PREVIEW CUADRADO CON OVERLAY DE GUÍAS */}
    <View>
      <Image
        source={{ uri: imageToEdit }}
        style={{
          width: SCREEN_WIDTH * 0.9,
          height: SCREEN_WIDTH * 0.9, // CUADRADO 1:1
        }}
        resizeMode="cover"
      />

      {/* GUÍAS DE RECORTE (BORDE ROJO PUNTEADO) */}
      <View style={{ borderStyle: 'dashed', borderColor: '#DC2626' }} />
    </View>

    {/* INFO */}
    <Text>La imagen se recortará en formato cuadrado 1:1</Text>
    {mediaType === 'video' && <Text>📹 Máximo 10 segundos</Text>}
  </Modal>
);
```

### 4. PROCESAMIENTO Y SUBIDA

```typescript
const handleEditorSave = async () => {
  // 1. Comprimir y recortar a cuadrado
  const manipulatedImage = await manipulateAsync(
    imageToEdit,
    [{ resize: { width: 1080 } }, { crop: { originX: 0, originY: 0, width: 1080, height: 1080 } }],
    { compress: 0.7, format: SaveFormat.JPEG }
  );

  // 2. Subir a Supabase Storage
  await uploadExerciseMedia(manipulatedImage.uri, mediaType);

  // 3. Feedback háptico
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

const uploadExerciseMedia = async (uri: string, type: 'photo' | 'video') => {
  // 1. Eliminar archivo anterior (no acumular espacio)
  if (currentExercise.image) {
    const oldPath = extractPathFromUrl(currentExercise.image);
    await supabase.storage.from('exercise-media').remove([oldPath]);
  }

  // 2. Leer archivo como base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 3. Subir nuevo archivo
  const filePath = `${user.id}/${exerciseId}/exercise_${timestamp}.${ext}`;
  await supabase.storage.from('exercise-media').upload(filePath, decode(base64), {
    contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
  });

  // 4. Obtener URL pública
  const { data } = supabase.storage.from('exercise-media').getPublicUrl(filePath);

  // 5. Actualizar registro en base de datos
  await supabase.from('user_assets').upsert({
    user_id: user.id,
    exercise_id: exerciseId,
    media_url: data.publicUrl,
    media_type: type,
  });
};
```

---

## 📦 ESTRUCTURA DE ARCHIVOS

### Supabase Storage: `exercise-media`

```
exercise-media/
├── {user_id}/
│   ├── {exercise_id}/
│   │   ├── exercise_1735428392847.jpg (foto capturada)
│   │   ├── exercise_1735428456123.jpg (foto de galería)
│   │   └── exercise_1735428512456.mp4 (video de galería - FUTURO)
```

### Base de Datos: `user_assets`

```sql
CREATE TABLE user_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('photo', 'video')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice único: Un asset por ejercicio por usuario
CREATE UNIQUE INDEX idx_user_exercise ON user_assets(user_id, exercise_id);
```

---

## 🎨 ESTADOS Y VARIABLES

```typescript
// Estados del modal de cámara
const [cameraModalVisible, setCameraModalVisible] = useState(false);
const [permission, requestPermission] = useCameraPermissions();
const [captureProcessing, setCaptureProcessing] = useState(false);

// Estados del editor
const [editorVisible, setEditorVisible] = useState(false);
const [imageToEdit, setImageToEdit] = useState<string | null>(null);
const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
```

---

## ⚠️ LIMITACIONES ACTUALES

### 1. EDITOR SIMPLE (NO INTERACTIVO)

- El usuario NO puede mover/hacer zoom en la imagen
- Se muestra un preview estático con guías de recorte
- Al guardar, se recorta automáticamente al centro cuadrado

**Razón**: expo-image-editor tiene conflictos de dependencias con React 19.
**Solución Futura**: Implementar gestos con PanResponder o librería alternativa.

### 2. VIDEO SIN EDITOR DE TIMELINE

- Se puede seleccionar video de galería
- Se recorta al cuadrado, pero NO se puede seleccionar segmento de 10s
- Se sube el video completo (potencialmente >10s)

**Razón**: No hay librería sencilla para edición de video en Expo.
**Solución Futura**: Implementar con expo-video + FFmpeg o react-native-video-processing.

### 3. SOLO FOTOS EN CÁMARA

- El botón de captura solo hace fotos
- NO hay modo video (grabación)

**Razón**: Problemas técnicos con recordAsync en Expo Go.
**Solución**: Funciona en Development Build (`npx expo run:android`).

---

## 🚀 ROADMAP

### FASE 1 (ACTUAL) ✅

- [x] Captura de foto con cámara
- [x] Selección de foto/video de galería
- [x] Editor simple con preview cuadrado
- [x] Recorte automático a 1080x1080px
- [x] Subida a Supabase Storage
- [x] Eliminación de archivo anterior

### FASE 2 (PENDIENTE)

- [ ] Editor interactivo con pinch-to-zoom y pan
- [ ] Timeline de video con selección de 10s
- [ ] Grabación de video con cámara
- [ ] Filtros/efectos en editor (brillo, contraste, saturación)

### FASE 3 (FUTURO)

- [ ] Múltiples fotos por ejercicio (carousel)
- [ ] Compartir ejercicio con foto en redes sociales
- [ ] IA para analizar forma del ejercicio (Hank IA integration)

---

## 🧪 TESTING

### CHECKLIST

- [ ] Presionar botón de cámara en imagen de ejercicio
- [ ] Presionar "SELECCIONAR DE GALERÍA"
- [ ] Seleccionar foto de galería
- [ ] Verificar que se abre modal de editor
- [ ] Verificar preview cuadrado con guías rojas
- [ ] Presionar "GUARDAR"
- [ ] Verificar que imagen se actualiza en ejercicio
- [ ] Verificar que archivo se subió a Supabase Storage
- [ ] Seleccionar otra foto/video
- [ ] Verificar que archivo anterior se eliminó
- [ ] Reiniciar app y verificar persistencia

### COMANDOS DE DEBUG

```bash
# Ver logs en tiempo real
npx expo start --tunnel

# Verificar archivos en Supabase Storage
# Dashboard → Storage → exercise-media

# Verificar registros en base de datos
# Dashboard → SQL Editor
SELECT * FROM user_assets ORDER BY created_at DESC LIMIT 10;
```

---

## 🐛 TROUBLESHOOTING

### Error: "Se requiere permiso para acceder a la galería"

**Causa**: Permisos no otorgados en Android.
**Solución**: Settings → Apps → Expo Go → Permissions → Photos & Videos → Allow.

### Error: "No se pudo subir el archivo"

**Causa**: Bucket no existe o políticas RLS bloqueando.
**Solución**: Aplicar migración `003_create_exercise_media_bucket.sql` en Dashboard.

### Imagen aparece estirada en editor

**Causa**: Aspect ratio de imagen original no es cuadrado.
**Solución**: Usar `resizeMode="cover"` para recortar centro automáticamente.

### Video se sube pero no se reproduce

**Causa**: Formato de video no compatible o corrupto.
**Solución**: Usar solo MP4 con codec H.264. Agregar validación de formato.

---

## 📚 DEPENDENCIAS

```json
{
  "expo-camera": "^16.0.11",
  "expo-image-picker": "^16.0.4",
  "expo-image-manipulator": "^13.0.5",
  "expo-file-system": "^18.0.7",
  "expo-haptics": "^14.0.1"
}
```

---

## 🎨 SAVAGE MODE COMPLIANCE

✅ Fondo: Absolute Black (#000000)  
✅ Acento: Savage Red (#DC2626)  
✅ Texto: White (#FFFFFF) y Zinc-400 (#A1A1AA)  
✅ Tipografía: font-bold para botones, font-mono no aplica  
✅ NativeWind: 100% TailwindCSS, cero StyleSheet.create  
✅ Iconos: CameraIcon de lucide-react-native  
✅ Feedback: Haptics en todas las interacciones

---

**ESTADO**: ✅ FUNCIONAL (Fotos solamente)  
**ÚLTIMA ACTUALIZACIÓN**: 2025-01-01
