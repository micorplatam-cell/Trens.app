// ============================================================================
// HANK CHAT STATE - Ref global para el estado del chat
// Evita re-renders innecesarios cuando solo necesitamos leer el estado
// ============================================================================

// Ref global para saber si el chat de HANK está abierto
// Esto permite que otros componentes lean el estado sin suscribirse a cambios
let _isChatOpen = false;

// Lista de callbacks para notificar cambios (sin causar re-renders de React)
const _listeners: Set<(isOpen: boolean) => void> = new Set();

/**
 * Actualiza el estado del chat de HANK
 * Llamado por HankOverlay cuando el chat se abre/cierra
 */
export const setHankChatOpen = (isOpen: boolean): void => {
  _isChatOpen = isOpen;
  // Notificar a los listeners (refs, no estados)
  _listeners.forEach((listener) => listener(isOpen));
};

/**
 * Lee el estado actual del chat de HANK
 * No causa re-renders, solo lee el valor actual
 */
export const isHankChatOpen = (): boolean => {
  return _isChatOpen;
};

/**
 * Suscribe un listener para cambios en el estado del chat
 * El listener recibe el nuevo valor cuando cambia
 * Retorna una función para desuscribirse
 */
export const subscribeToHankChat = (listener: (isOpen: boolean) => void): (() => void) => {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
};
