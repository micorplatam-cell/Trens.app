-- ============================================================================
-- ADD TIMES COLUMN - Múltiples horarios para suplementos
-- Ejecutar en SQL Editor de Supabase
-- ============================================================================

-- Agregar columna times para soportar múltiples horarios
-- Útil para suplementos que se toman varias veces al día
ALTER TABLE public.supplement_stack 
ADD COLUMN IF NOT EXISTS times TEXT[] DEFAULT NULL;

-- Comentario descriptivo
COMMENT ON COLUMN public.supplement_stack.times IS 
  'Array de horarios en formato HH:MM para suplementos con múltiples tomas al día';

-- ============================================================================
-- ✅ MIGRACIÓN COMPLETADA
-- ============================================================================
