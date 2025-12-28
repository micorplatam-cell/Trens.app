-- Migration: Add exercise_notes and tags columns to pro_videos
-- Date: 2025-07-10
-- Purpose: Capture exercise notes and tags when recording PRO videos

-- Add exercise_notes column (text from user's notes on the exercise)
ALTER TABLE public.pro_videos 
ADD COLUMN IF NOT EXISTS exercise_notes TEXT;

-- Add tags column (array of predefined tags like 'PR', 'Dolor', 'Subir Peso', etc.)
ALTER TABLE public.pro_videos 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add notes column (general notes for the video itself)
ALTER TABLE public.pro_videos 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comment on columns for documentation
COMMENT ON COLUMN public.pro_videos.exercise_notes IS 'Exercise notes captured from user_exercise_config at recording time';
COMMENT ON COLUMN public.pro_videos.tags IS 'Array of predefined tags (PR, Dolor, Subir Peso, Técnica, Bomba, Fatiga)';
COMMENT ON COLUMN public.pro_videos.notes IS 'Additional notes specific to this video';
