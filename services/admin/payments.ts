// ============================================================================
// ADMIN PAYMENTS SERVICE - Openpay Integration
// Servicio para obtener datos de pagos y métricas financieras
// ============================================================================

import { supabase } from '../../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================
export interface Payment {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled';
  openpay_transaction_id?: string;
  card_brand?: string;
  card_last4?: string;
  description?: string;
  error_message?: string;
  created_at: string;
}

export interface FinancialStats {
  // Revenue
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number;

  // Users
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  newUsersThisMonth: number;
  newProThisMonth: number;

  // Conversion & Retention
  conversionRate: number;
  churnRate: number;
  avgLifetimeValue: number;

  // Subscriptions
  activeSubscriptions: number;
  cancelledThisMonth: number;

  // Payments
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
  avgPaymentAmount: number;
}

export interface ChartData {
  labels: string[];
  revenue: number[];
  users: number[];
  totalRevenue?: number;
  totalUsers?: number;
  dateFrom?: string;
  dateTo?: string;
  isSingleMonth?: boolean;
}

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

export interface PaymentsFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

// ============================================================================
// FETCH ALL PAYMENTS
// ============================================================================
export async function getPayments(filters?: PaymentsFilters): Promise<Payment[]> {
  const { data, error } = await supabase.functions.invoke('admin-payments', {
    body: { action: 'list-payments', filters },
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Error al obtener pagos');
  }

  return data.payments;
}

// ============================================================================
// FETCH FINANCIAL STATS
// ============================================================================
export async function getFinancialStats(): Promise<FinancialStats> {
  const { data, error } = await supabase.functions.invoke('admin-payments', {
    body: { action: 'get-stats' },
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Error al obtener estadísticas');
  }

  return data.stats;
}

// ============================================================================
// FETCH CHART DATA (Rango dinámico)
// ============================================================================
export async function getChartData(dateRange?: DateRange): Promise<ChartData> {
  const { data, error } = await supabase.functions.invoke('admin-payments', {
    body: {
      action: 'get-chart-data',
      dateFrom: dateRange?.dateFrom,
      dateTo: dateRange?.dateTo,
    },
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Error al obtener datos del gráfico');
  }

  return data.chartData;
}

// ============================================================================
// SYNC WITH OPENPAY
// ============================================================================
export async function syncWithOpenpay(): Promise<{ synced: number }> {
  const { data, error } = await supabase.functions.invoke('admin-payments', {
    body: { action: 'sync-openpay' },
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Error al sincronizar con Openpay');
  }

  return { synced: data.synced };
}

// ============================================================================
// DEBUG OPENPAY CONNECTION
// ============================================================================
export async function debugOpenpay(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('admin-payments', {
    body: { action: 'debug-openpay' },
  });

  if (error) {
    throw new Error(error.message || 'Error en debug');
  }

  return data;
}

// ============================================================================
// PROCESS REFUND
// ============================================================================
export async function processRefund(paymentId: string, reason?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-payments', {
    body: { action: 'refund', paymentId, reason },
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'Error al procesar reembolso');
  }
}

// ============================================================================
// EXPORT PAYMENTS TO CSV
// ============================================================================
export function exportToCSV(payments: Payment[]): string {
  const headers = ['ID', 'Usuario', 'Email', 'Monto', 'Moneda', 'Estado', 'Tarjeta', 'Fecha'].join(
    ','
  );

  const rows = payments.map((p) =>
    [
      p.id,
      `"${p.user_name || 'N/A'}"`,
      p.user_email || 'N/A',
      p.amount.toFixed(2),
      p.currency,
      p.status,
      `${p.card_brand || ''} ****${p.card_last4 || ''}`,
      new Date(p.created_at).toLocaleDateString('es-PE'),
    ].join(',')
  );

  return [headers, ...rows].join('\n');
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
const adminPayments = {
  getPayments,
  getFinancialStats,
  getChartData,
  syncWithOpenpay,
  debugOpenpay,
  processRefund,
  exportToCSV,
};

export default adminPayments;
