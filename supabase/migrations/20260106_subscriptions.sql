-- ============================================================================
-- SUBSCRIPTIONS TABLE - Openpay Integration
-- ============================================================================

-- Tabla de suscripciones
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Openpay data
  openpay_customer_id TEXT NOT NULL,
  openpay_subscription_id TEXT NOT NULL,
  openpay_card_last4 TEXT,
  openpay_card_brand TEXT,
  
  -- Subscription details
  plan_id TEXT NOT NULL DEFAULT 'pr6jao0vinkuqcqmkl4p',
  amount DECIMAL(10,2) NOT NULL DEFAULT 59.90,
  currency TEXT NOT NULL DEFAULT 'PEN',
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, past_due, trialing
  
  -- Period tracking
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id),
  UNIQUE(openpay_subscription_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_openpay_customer ON subscriptions(openpay_customer_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver su propia suscripción
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el sistema puede insertar/actualizar (via service role)
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- También actualizar user_roles a PRO cuando hay suscripción activa
CREATE OR REPLACE FUNCTION sync_subscription_to_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    -- Actualizar a PRO
    UPDATE user_roles 
    SET role = 'pro', updated_at = now()
    WHERE user_id = NEW.user_id;
    
    -- Si no existe, crear
    IF NOT FOUND THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.user_id, 'pro')
      ON CONFLICT (user_id) DO UPDATE SET role = 'pro';
    END IF;
  ELSIF NEW.status IN ('cancelled', 'past_due') THEN
    -- Degradar a FREE
    UPDATE user_roles 
    SET role = 'free', updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_subscription_role ON subscriptions;
CREATE TRIGGER trigger_sync_subscription_role
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_role();

-- ============================================================================
-- GRANT PERMISOS
-- ============================================================================
GRANT SELECT ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;
