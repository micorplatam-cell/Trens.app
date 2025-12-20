// ============================================================================
// USE WAKE WORD - Hook simplificado para detección de palabra "HANK"
// Por ahora DESACTIVADO - requiere development build para funcionar con
// reconocimiento de voz nativo. Se mantiene como stub para no romper imports.
// ============================================================================

import { useState, useCallback } from 'react';

interface UseWakeWordReturn {
  isListeningForWakeWord: boolean;
  isActivated: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetActivation: () => void;
  error: string | null;
}

export function useWakeWord(onWakeWordDetected: () => void): UseWakeWordReturn {
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(async () => {
    setError('Wake word requiere development build. Por ahora desactivado en Expo Go.');
    console.warn('⚠️ Wake word no disponible en Expo Go');
  }, []);

  const stopListening = useCallback(() => {
    setIsListeningForWakeWord(false);
  }, []);

  const resetActivation = useCallback(() => {
    setIsActivated(false);
  }, []);

  return {
    isListeningForWakeWord,
    isActivated,
    startListening,
    stopListening,
    resetActivation,
    error,
  };
}
