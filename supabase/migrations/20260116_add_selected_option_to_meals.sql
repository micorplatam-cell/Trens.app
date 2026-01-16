-- ============================================================================
-- MIGRACIÓN: Agregar selected_option a meals
-- Permite persistir qué alternativa tiene el usuario seleccionada
-- ============================================================================

-- Agregar columna si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meals' 
    AND column_name = 'selected_option'
  ) THEN
    ALTER TABLE public.meals ADD COLUMN selected_option INTEGER DEFAULT 0;
    COMMENT ON COLUMN public.meals.selected_option IS 'Índice de la opción/alternativa seleccionada (0-based)';
  END IF;
END $$;

-- Crear índice para queries rápidos
CREATE INDEX IF NOT EXISTS idx_meals_selected_option ON public.meals(selected_option);
