// ============================================================================
// OPENPAY WEBHOOK - Supabase Edge Function
// Recibe notificaciones de Openpay sobre eventos de suscripción
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuración de Openpay (desde variables de entorno)
const OPENPAY_PRIVATE_KEY = Deno.env.get('OPENPAY_PRIVATE_KEY') || '';
const OPENPAY_MERCHANT_ID = Deno.env.get('OPENPAY_MERCHANT_ID') || '';

// Tipos de eventos de Openpay
type OpenpayEventType =
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.refunded'
  | 'charge.cancelled'
  | 'subscription.charge.succeeded'
  | 'subscription.charge.failed'
  | 'subscription.cancelled'
  | 'payout.created'
  | 'payout.succeeded'
  | 'payout.failed';

interface OpenpayWebhookEvent {
  type: OpenpayEventType;
  event_date: string;
  transaction: {
    id: string;
    authorization: string;
    operation_type: string;
    method: string;
    transaction_type: string;
    status: string;
    currency: string;
    amount: number;
    description: string;
    customer_id: string;
    order_id?: string;
    error_message?: string;
    subscription?: {
      id: string;
      plan_id: string;
      status: string;
      current_period_end_date: string;
    };
  };
}

serve(async (req) => {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ================================================================
    // LOG TODO PARA DEBUG
    // ================================================================
    console.log('📥 WEBHOOK REQUEST:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    // Verificar si hay código en query params
    const allParams = Object.fromEntries(url.searchParams.entries());
    console.log('📥 Query params:', allParams);

    // Buscar cualquier parámetro que parezca un código
    const verificationCode =
      url.searchParams.get('verification_code') ||
      url.searchParams.get('code') ||
      url.searchParams.get('verify') ||
      url.searchParams.get('token');

    if (verificationCode) {
      console.log('🔐 Returning verification code from params:', verificationCode);
      return new Response(verificationCode, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // GET sin código - endpoint activo
    if (req.method === 'GET') {
      // Si hay algún param, devolverlo (por si es el código)
      const firstParam = url.searchParams.keys().next().value;
      if (firstParam) {
        const value = url.searchParams.get(firstParam);
        console.log('🔐 Returning first param as code:', firstParam, '=', value);
        return new Response(value || firstParam, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // POST: Leer el body
    if (req.method === 'POST') {
      const body = await req.text();
      console.log('📥 POST body:', body);

      // Si el body es corto y no es JSON, es probablemente el código
      if (body && body.length < 100 && !body.startsWith('{')) {
        console.log('🔐 Returning POST body as code:', body.trim());
        return new Response(body.trim(), {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      // Si es JSON
      if (body.startsWith('{')) {
        const event = JSON.parse(body);
        console.log('📥 JSON event keys:', Object.keys(event));

        // Buscar cualquier campo que parezca código de verificación
        // Openpay envía: {"type":"verification","verification_code":"XXX",...}
        if (event.verification_code) {
          const code = String(event.verification_code).trim();
          console.log('🔐 Returning verification_code:', code, 'Length:', code.length);
          // Responder EXACTAMENTE con el código, sin nada extra
          return new Response(code, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Content-Length': String(code.length),
              ...corsHeaders,
            },
          });
        }

        // Si tiene type (y no es verificación), es un evento normal
        if (event.type && event.type !== 'verification') {
          console.log('📥 Openpay event type:', event.type);

          // Crear cliente de Supabase con service role
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const supabase = createClient(supabaseUrl, supabaseServiceKey);

          // Procesar según el tipo de evento
          switch (event.type) {
            // ================================================================
            // CARGO DE SUSCRIPCIÓN EXITOSO
            // ================================================================
            case 'subscription.charge.succeeded': {
              const { customer_id, subscription } = event.transaction;

              if (subscription) {
                // Actualizar estado de suscripción
                const { error } = await supabase
                  .from('subscriptions')
                  .update({
                    status: 'active',
                    current_period_end: subscription.current_period_end_date,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('openpay_customer_id', customer_id);

                if (error) {
                  console.error('Error updating subscription:', error);
                } else {
                  console.log('✅ Subscription renewed:', customer_id);
                }
              }
              break;
            }

            // ================================================================
            // CARGO DE SUSCRIPCIÓN FALLIDO
            // ================================================================
            case 'subscription.charge.failed': {
              const { customer_id, error_message } = event.transaction;

              // Marcar como past_due (pago pendiente)
              const { error } = await supabase
                .from('subscriptions')
                .update({
                  status: 'past_due',
                  updated_at: new Date().toISOString(),
                })
                .eq('openpay_customer_id', customer_id);

              if (error) {
                console.error('Error updating subscription:', error);
              } else {
                console.log('⚠️ Subscription payment failed:', customer_id, error_message);
              }
              break;
            }

            // ================================================================
            // SUSCRIPCIÓN CANCELADA
            // ================================================================
            case 'subscription.cancelled': {
              const { customer_id } = event.transaction;

              const { error } = await supabase
                .from('subscriptions')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('openpay_customer_id', customer_id);

              if (error) {
                console.error('Error updating subscription:', error);
              } else {
                console.log('🚫 Subscription cancelled:', customer_id);
              }
              break;
            }

            // ================================================================
            // CARGO ÚNICO EXITOSO
            // ================================================================
            case 'charge.succeeded': {
              console.log('💳 Charge succeeded:', event.transaction.id);
              break;
            }

            // ================================================================
            // CARGO FALLIDO
            // ================================================================
            case 'charge.failed': {
              console.log(
                '❌ Charge failed:',
                event.transaction.id,
                event.transaction.error_message
              );
              break;
            }

            // ================================================================
            // REEMBOLSO
            // ================================================================
            case 'charge.refunded': {
              const { customer_id } = event.transaction;

              const { error } = await supabase
                .from('subscriptions')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('openpay_customer_id', customer_id);

              if (error) {
                console.error('Error updating subscription:', error);
              } else {
                console.log('💸 Charge refunded, subscription cancelled:', customer_id);
              }
              break;
            }

            default:
              console.log('ℹ️ Unhandled event type:', event.type);
          }

          // Responder OK a Openpay
          return new Response(JSON.stringify({ received: true, type: event.type }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Método no soportado o request no reconocido
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
