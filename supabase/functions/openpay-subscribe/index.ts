// ============================================================================
// OPENPAY CREATE SUBSCRIPTION - Supabase Edge Function
// Crea cliente + suscripción usando la llave privada (server-side)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuración de Openpay (PRIVADA - solo servidor)
const OPENPAY_PRIVATE_KEY = 'sk_302bd1805afd4602965076e5441514cb';
const OPENPAY_MERCHANT_ID = 'mudi9kij0xb5xk54urc6';
const OPENPAY_PLAN_ID = 'pr6jao0vinkuqcqmkl4p'; // PROD: S/59.90 mensual
const OPENPAY_API_URL = 'https://api.openpay.pe/v1';

interface CreateSubscriptionRequest {
  tokenId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tokenId, customer, userId }: CreateSubscriptionRequest = await req.json();

    console.log('📥 Creating subscription for:', customer.email);

    // ================================================================
    // 1. CREAR CLIENTE EN OPENPAY
    // ================================================================
    const customerResponse = await fetch(`${OPENPAY_API_URL}/${OPENPAY_MERCHANT_ID}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(OPENPAY_PRIVATE_KEY + ':')}`,
      },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone,
        requires_account: false,
      }),
    });

    if (!customerResponse.ok) {
      const error = await customerResponse.json();
      console.error('❌ Error creating customer:', error);
      throw new Error(error.description || 'Error al crear cliente');
    }

    const customerData = await customerResponse.json();
    const customerId = customerData.id;
    console.log('✅ Customer created:', customerId);

    // ================================================================
    // 2. CREAR SUSCRIPCIÓN
    // ================================================================
    const subscriptionResponse = await fetch(
      `${OPENPAY_API_URL}/${OPENPAY_MERCHANT_ID}/customers/${customerId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(OPENPAY_PRIVATE_KEY + ':')}`,
        },
        body: JSON.stringify({
          plan_id: OPENPAY_PLAN_ID,
          source_id: tokenId,
        }),
      }
    );

    if (!subscriptionResponse.ok) {
      const error = await subscriptionResponse.json();
      console.error('❌ Error creating subscription:', error);
      throw new Error(error.description || 'Error al crear suscripción');
    }

    const subscription = await subscriptionResponse.json();
    console.log('✅ Subscription created:', subscription.id);

    // ================================================================
    // 3. GUARDAR EN SUPABASE
    // ================================================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insertar/actualizar suscripción
    const { error: dbError } = await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        openpay_customer_id: customerId,
        openpay_subscription_id: subscription.id,
        plan_id: OPENPAY_PLAN_ID,
        status: 'active',
        current_period_end: subscription.period_end_date || subscription.current_period_end_date,
        openpay_card_last4: subscription.card?.card_number?.slice(-4) || '',
        openpay_card_brand: subscription.card?.brand || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (dbError) {
      console.error('❌ Error saving to database:', dbError);
      // No lanzar error - la suscripción ya fue creada en Openpay
    }

    // Actualizar rol del usuario a PRO en user_roles
    // Primero intentar update, si no existe hacer insert
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (existingRole) {
      // Update existing
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'pro', updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (roleError) {
        console.error('❌ Error updating role:', roleError);
      } else {
        console.log('✅ Role updated to PRO for user:', userId);
      }
    } else {
      // Insert new
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'pro' });

      if (roleError) {
        console.error('❌ Error inserting role:', roleError);
      } else {
        console.log('✅ Role inserted as PRO for user:', userId);
      }
    }

    console.log('✅ Subscription complete for user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscription.id,
        customerId: customerId,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end_date,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Subscription error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error al procesar suscripción',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
