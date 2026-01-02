-- Migration: Create user_exercise_media table for persistent custom media
-- This table stores custom images/videos for exercises that persist even if
-- the exercise is removed from user_exercise_config

-- Create the persistent media table
CREATE TABLE IF NOT EXISTS public.user_exercise_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  custom_media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one custom media per user per exercise
  UNIQUE(user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE public.user_exercise_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own exercise media"
  ON public.user_exercise_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise media"
  ON public.user_exercise_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise media"
  ON public.user_exercise_media FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise media"
  ON public.user_exercise_media FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_exercise_media_user_id ON public.user_exercise_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_media_exercise_id ON public.user_exercise_media(exercise_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_media_lookup ON public.user_exercise_media(user_id, exercise_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_exercise_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_exercise_media_updated_at
  BEFORE UPDATE ON public.user_exercise_media
  FOR EACH ROW
  EXECUTE FUNCTION update_user_exercise_media_updated_at();

-- Migrate existing custom_media_url from user_exercise_config
INSERT INTO public.user_exercise_media (user_id, exercise_id, custom_media_url, media_type)
SELECT 
  user_id,
  exercise_id,
  custom_media_url,
  CASE 
    WHEN custom_media_url LIKE '%.mp4%' OR custom_media_url LIKE '%.mov%' OR custom_media_url LIKE '%.webm%' 
    THEN 'video' 
    ELSE 'image' 
  END
FROM public.user_exercise_config
WHERE custom_media_url IS NOT NULL
ON CONFLICT (user_id, exercise_id) DO UPDATE
SET custom_media_url = EXCLUDED.custom_media_url,
    updated_at = NOW();

-- Comment
COMMENT ON TABLE public.user_exercise_media IS 'Persistent storage for user custom exercise images/videos. Survives exercise removal from routine.';
