// ============================================================================
// PAGO EXITOSO - Ruta directa /pago-exitoso
// Redirige a (web)/pago-exitoso
// ============================================================================

import { Redirect } from 'expo-router';

export default function PagoExitosoRedirect() {
  return <Redirect href="/(web)/pago-exitoso" />;
}
