// ============================================================================
// HANK INLINE HIGHLIGHT - DESACTIVADO
// El efecto de highlight ahora es fullscreen en HankTargetHighlight.tsx
// Este componente se mantiene para no romper imports pero no renderiza nada
// ============================================================================

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================
interface HankInlineHighlightProps {
  isActive: boolean;
  phase: 'idle' | 'flying' | 'working' | 'success' | 'returning';
  borderRadius?: number;
}

// ============================================================================
// COMPONENT - Retorna null (desactivado - el efecto es fullscreen ahora)
// ============================================================================
export const HankInlineHighlight: React.FC<HankInlineHighlightProps> = () => {
  // El efecto de highlight ahora es fullscreen en HankTargetHighlight.tsx
  // Este componente está desactivado para evitar problemas de precisión
  return null;
};

export default HankInlineHighlight;
