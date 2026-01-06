// ============================================================================
// OPENPAY PERU - INTEGRATION
// Suscripciones con tarjeta de crédito/débito
// ============================================================================

import { supabase } from './supabase';

// Configuración de Openpay Perú (SOLO LLAVE PÚBLICA para cliente)
const OPENPAY_CONFIG = {
  merchantId: 'mudi9kij0xb5xk54urc6',
  publicKey: 'pk_8ce5687a939145189673ff91c3282463',
  // La llave privada SOLO se usa en Edge Functions (servidor)
  isSandbox: false, // Producción
  apiUrl: 'https://api.openpay.pe/v1',
};

// ============================================================================
// TIPOS
// ============================================================================

export interface OpenpayCard {
  card_number: string;
  holder_name: string;
  expiration_year: string;
  expiration_month: string;
  cvv2: string;
}

export interface OpenpayCustomer {
  name: string;
  email: string;
  phone_number: string;
}

export interface OpenpayTokenResponse {
  id: string;
  card: {
    card_number: string;
    holder_name: string;
    expiration_year: string;
    expiration_month: string;
    brand: string;
    type: string;
  };
}

export interface OpenpaySubscriptionResponse {
  id: string;
  status: string;
  customer_id: string;
  plan_id: string;
  card: {
    brand: string;
    last4: string;
  };
  current_period_end_date: string;
  trial_end_date: string | null;
}

// ============================================================================
// TOKENIZACIÓN DE TARJETA (Client-side)
// ============================================================================

export async function createCardToken(card: OpenpayCard): Promise<OpenpayTokenResponse> {
  const response = await fetch(`${OPENPAY_CONFIG.apiUrl}/${OPENPAY_CONFIG.merchantId}/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(OPENPAY_CONFIG.publicKey + ':')}`,
    },
    body: JSON.stringify({
      card_number: card.card_number.replace(/\s/g, ''),
      holder_name: card.holder_name.toUpperCase(),
      expiration_year: card.expiration_year,
      expiration_month: card.expiration_month,
      cvv2: card.cvv2,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.description || 'Error al procesar la tarjeta');
  }

  return response.json();
}

// ============================================================================
// CREAR CLIENTE + SUSCRIPCIÓN (via Edge Function - server-side)
// ============================================================================

export interface CreateSubscriptionParams {
  tokenId: string;
  customer: OpenpayCustomer;
  userId: string;
}

export interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  customerId?: string;
  status?: string;
  currentPeriodEnd?: string;
  error?: string;
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<CreateSubscriptionResult> {
  const { data, error } = await supabase.functions.invoke('openpay-subscribe', {
    body: {
      tokenId: params.tokenId,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        phone: params.customer.phone_number,
      },
      userId: params.userId,
    },
  });

  if (error) {
    console.error('Subscription error:', error);
    return { success: false, error: error.message };
  }

  return data;
}

// ============================================================================
// CANCELAR SUSCRIPCIÓN (via Edge Function - TODO: implementar)
// ============================================================================

export async function cancelSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('openpay-cancel', {
    body: { subscriptionId },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

// ============================================================================
// UTILIDADES DE TARJETA (Client-side)
// ============================================================================
export function formatCardNumber(value: string): string {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length ? parts.join(' ') : v;
}

// Formatear fecha de expiración
export function formatExpiry(value: string): string {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + '/' + v.substring(2, 4);
  }
  return v;
}

// Validar número de tarjeta (Luhn algorithm)
export function validateCardNumber(number: string): boolean {
  const cleaned = number.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(cleaned)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Detectar marca de tarjeta
export function getCardBrand(number: string): string {
  const cleaned = number.replace(/\s/g, '');
  if (/^4/.test(cleaned)) return 'visa';
  if (/^5[1-5]/.test(cleaned)) return 'mastercard';
  if (/^3[47]/.test(cleaned)) return 'amex';
  if (/^6(?:011|5)/.test(cleaned)) return 'discover';
  if (/^(?:2131|1800|35)/.test(cleaned)) return 'jcb';
  return 'unknown';
}

// Obtener precio formateado
export function getFormattedPrice(): string {
  return 'S/ 59.90';
}

export function getPlanDetails() {
  return {
    name: 'TRENS PRO',
    price: 59.9,
    currency: 'PEN',
    period: 'mensual',
    features: [
      'Grabación de videos ilimitada',
      'Guardado en tu bóveda personal',
      'Registro de PRs y récords',
      'Historial completo de entrenamientos',
      'Sincronización con Spotify',
      'Planes de nutrición personalizados',
      'Suplementación inteligente',
      'Asistente HANK con IA',
      'Fotos de progreso',
      'Métricas avanzadas de ADN atlético',
    ],
  };
}

export default {
  createCardToken,
  createSubscription,
  cancelSubscription,
  formatCardNumber,
  formatExpiry,
  validateCardNumber,
  getCardBrand,
  getFormattedPrice,
  getPlanDetails,
  config: OPENPAY_CONFIG,
};
