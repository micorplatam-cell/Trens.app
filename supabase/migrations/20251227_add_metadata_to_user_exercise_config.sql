-- Migration: Add metadata column to user_exercise_config
-- Date: 2025-12-27
-- Purpose: Store exercise notes and tags in a JSONB field

-- Add metadata column for flexible storage of notes, tags, etc.
ALTER TABLE public.user_exercise_config 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Comment on column
COMMENT ON COLUMN public.user_exercise_config.metadata IS 'Flexible JSONB field for notes, tags, and other exercise-specific data';
