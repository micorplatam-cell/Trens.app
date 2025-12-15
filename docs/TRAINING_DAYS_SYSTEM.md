# Sistema de Días de Entrenamiento Rotativos

## Descripción

Sistema que maneja automáticamente la rotación de días de entrenamiento según la frecuencia semanal del usuario.

## Características

### 1. Toggle de Días (Vista STRUCTURE)

- Muestra todos los días de entrenamiento según la frecuencia configurada
- Cada toggle muestra:
  - **Día**: Número del día (1, 2, 3...)
  - **Día de la semana**: Solo en el día actual (Lunes, Martes, etc.)
  - **Grupos musculares**: Ej. "Pecho y Espalda"
  - **Indicador verde**: Marca el día de entrenamiento vigente

### 2. Rotación Automática

La app detecta automáticamente cuándo avanzar al siguiente día:

#### Lógica de Actualización:

1. **Primera vez**: Usuario inicia en Día 1
2. **Mismo día**: Mantiene el día actual aunque entre varias veces
3. **Día siguiente o posterior**: Avanza automáticamente al siguiente día de entrenamiento
4. **Ciclo completo**: Cuando llega al último día, reinicia al Día 1

#### Ejemplo:

- **Lunes 9pm**: Usuario entrena Día 1 (Pecho y Espalda)
- **Lunes 11pm**: Termina entrenamiento, no marca nada
- **Martes 12am**: Sistema detecta nuevo día y actualiza a Día 2
- **Miércoles**: Usuario entra directamente, ve Día 2 (Hombros, Bíceps y Tríceps)

### 3. Ejercicios por Día

- Cada ejercicio está asociado a un día de entrenamiento específico
- Al cambiar de día en el toggle, se muestran solo los ejercicios de ese día
- Al agregar un ejercicio, se asigna automáticamente al día seleccionado

## Base de Datos

### Tabla `profiles`

```sql
training_last_access: TIMESTAMPTZ  -- Última entrada al módulo GYM
training_current_day: INTEGER      -- Día de entrenamiento actual (0-based)
training_frequency: INTEGER        -- Días por semana (3, 4, 5, 6)
```

### Tabla `user_assets`

```sql
training_day: INTEGER  -- Día al que pertenece el ejercicio (0-based)
```

## Migración

Ejecutar en Supabase: `supabase/migrations/006_add_training_days.sql`

## Configuración Predeterminada

```typescript
frequency: 3 días/semana
Día 1: Pecho y Espalda
Día 2: Hombros, Bíceps y Tríceps
Día 3: Piernas
```

## Futuras Mejoras

- [ ] Permitir al usuario configurar frecuencia y grupos musculares
- [ ] Historial de entrenamientos realizados
- [ ] Estadísticas de adherencia al programa
