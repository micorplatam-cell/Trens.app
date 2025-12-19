import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// ============================================================================
// TIPOS
// ============================================================================
export type ProContextType = 'tactical' | 'free';

export interface ProContextData {
  type: ProContextType;
  exerciseId?: string;
  exerciseName?: string;
  moduleName: 'GYM' | 'NUCLEO' | 'ADN' | 'PLAN';
}

interface ProContextValue {
  context: ProContextData;
  setTacticalContext: (exerciseId: string, exerciseName: string) => void;
  setFreeContext: (moduleName: 'NUCLEO' | 'ADN' | 'PLAN') => void;
  clearContext: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================
const ProContext = createContext<ProContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================
export function ProContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<ProContextData>({
    type: 'free',
    moduleName: 'NUCLEO',
  });

  const setTacticalContext = useCallback((exerciseId: string, exerciseName: string) => {
    setContext((prev) => {
      // Evitar actualización si el contexto es el mismo
      if (prev.type === 'tactical' && prev.exerciseId === exerciseId) {
        return prev;
      }
      return {
        type: 'tactical',
        exerciseId,
        exerciseName,
        moduleName: 'GYM',
      };
    });
  }, []);

  const setFreeContext = useCallback((moduleName: 'NUCLEO' | 'ADN' | 'PLAN') => {
    setContext((prev) => {
      if (prev.type === 'free' && prev.moduleName === moduleName) {
        return prev;
      }
      return {
        type: 'free',
        moduleName,
        exerciseId: undefined,
        exerciseName: undefined,
      };
    });
  }, []);

  const clearContext = useCallback(() => {
    setContext({
      type: 'free',
      moduleName: 'NUCLEO',
    });
  }, []);

  return (
    <ProContext.Provider
      value={{
        context,
        setTacticalContext,
        setFreeContext,
        clearContext,
      }}
    >
      {children}
    </ProContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================
export function useProContext() {
  const context = useContext(ProContext);
  if (!context) {
    throw new Error('useProContext must be used within a ProContextProvider');
  }
  return context;
}
