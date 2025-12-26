// ============================================================================
// FLOATING TOOLS LAYOUT - Posicionamiento centralizado de herramientas flotantes
// Este archivo define las constantes y cálculos para el stack vertical de FABs
// Orden de abajo hacia arriba: HANK → SPOTIFY → TIMER (cuando visible)
//
// El valor "bottom" en CSS posiciona el BORDE INFERIOR del elemento.
// Para espaciado visual uniforme entre FABs, calculamos:
//   spotify.bottom = hank.bottom + hank.height + gap
//   timer.bottom = spotify.bottom + spotify.height + gap
//
// ============================================================================

// Dimensiones de cada FAB
export const FAB_SIZES = {
  hank: 60, // HankFAB es 60x60px
  spotify: 56, // SpotifyFAB es 56x56px
  timer: 44, // Timer colapsado ~44px
} as const;

// Espaciado visual entre FABs (el espacio VISIBLE entre ellos)
export const FAB_GAP = 25;

// Padding desde el edge derecho
export const FAB_RIGHT_PADDING = 16;

// Tab bar base height (sin safe area)
export const TAB_BAR_BASE_HEIGHT = 56;

// Padding inicial desde el tab bar hasta el primer FAB (Hank)
export const FAB_BOTTOM_PADDING = 12;

/**
 * Calcula la posición `bottom` para cada FAB basándose en el safe area
 * @param bottomInset - El valor de insets.bottom del safe area
 * @returns Objeto con las posiciones bottom de cada FAB
 */
export function calculateFabPositions(bottomInset: number) {
  // Base = altura del tab bar + safe area + padding inicial
  const baseBottom = TAB_BAR_BASE_HEIGHT + bottomInset + FAB_BOTTOM_PADDING;

  // HANK es el FAB más abajo (bottom = distancia desde el borde inferior de la pantalla)
  const hankBottom = baseBottom;

  // SPOTIFY va encima de HANK
  // Para que haya GAP px de espacio visible entre ellos:
  // spotify.bottom = hank.bottom + hank.height + gap
  const spotifyBottom = hankBottom + FAB_SIZES.hank + FAB_GAP;

  // TIMER va encima de SPOTIFY (solo visible en GYM)
  // timer.bottom = spotify.bottom + spotify.height + gap
  const timerBottom = spotifyBottom + FAB_SIZES.spotify + FAB_GAP;

  return {
    hank: hankBottom,
    spotify: spotifyBottom,
    timer: timerBottom,
    right: FAB_RIGHT_PADDING,
  };
}
