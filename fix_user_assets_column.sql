-- ============================================================================
-- FIX: Agregar columnas faltantes a user_assets
-- ============================================================================

DO $$ 
BEGIN
    -- Agregar asset_url si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_assets' 
        AND column_name = 'asset_url'
    ) THEN
        ALTER TABLE user_assets ADD COLUMN asset_url TEXT;
    END IF;

    -- Agregar metadata si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_assets' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE user_assets ADD COLUMN metadata JSONB;
    END IF;

    -- Agregar order si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_assets' 
        AND column_name = 'order'
    ) THEN
        ALTER TABLE user_assets ADD COLUMN "order" INTEGER DEFAULT 0;
    END IF;

    -- Agregar updated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_assets' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_assets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Verificar estructura final de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_assets'
ORDER BY ordinal_position;
