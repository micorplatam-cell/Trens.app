-- ============================================================================
-- MIGRACIÓN: Series por día de entrenamiento
-- ============================================================================
-- Cambia la estructura de custom_series a series_by_day para que cada día
-- pueda tener su propia configuración de series para el mismo ejercicio.
--
-- ANTES: metadata.custom_series = [{reps, weight, type}, ...]
-- DESPUÉS: metadata.series_by_day = { "0": [...], "1": [...], "2": [...] }
-- ============================================================================

-- Migrar datos existentes: copiar custom_series a series_by_day para cada día
-- Usamos una función para generar el objeto series_by_day
DO $$
DECLARE
    asset_record RECORD;
    training_day INTEGER;
    series_by_day JSONB;
    custom_series JSONB;
BEGIN
    FOR asset_record IN 
        SELECT id, metadata, training_days 
        FROM user_assets 
        WHERE asset_type = 'gym_exercise'
          AND metadata ? 'custom_series'
          AND NOT (metadata ? 'series_by_day')
    LOOP
        custom_series := asset_record.metadata->'custom_series';
        series_by_day := '{}'::jsonb;
        
        -- Para cada día de entrenamiento, copiar las series actuales
        IF asset_record.training_days IS NOT NULL THEN
            FOREACH training_day IN ARRAY asset_record.training_days
            LOOP
                series_by_day := jsonb_set(series_by_day, ARRAY[training_day::text], custom_series);
            END LOOP;
        END IF;
        
        -- Actualizar el registro
        UPDATE user_assets 
        SET metadata = metadata || jsonb_build_object('series_by_day', series_by_day)
        WHERE id = asset_record.id;
    END LOOP;
END $$;

-- Para ejercicios sin series_by_day, agregar objeto vacío
UPDATE user_assets
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"series_by_day": {}}'::jsonb
WHERE asset_type = 'gym_exercise'
  AND NOT (metadata ? 'series_by_day');
