import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { HankProvider } from '../context/HankContext';
import { HankOverlay } from '../components/hank/HankOverlay';
import '../global.css';

// ============================================================================
// 1. AUTH PROVIDER
// ============================================================================
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// 2. SPORT PROVIDER (Placeholder - Conectar con lógica real)
// ============================================================================
const SportContext = createContext({});

export const useSport = () => useContext(SportContext);

const SportProvider = ({ children }: { children: React.ReactNode }) => {
  return <SportContext.Provider value={{}}>{children}</SportContext.Provider>;
};

// ============================================================================
// 3. HANK PROVIDER - Importado desde context/HankContext.tsx
// Re-exportamos useHank para acceso global
// ============================================================================
export { useHank } from '../context/HankContext';

// ============================================================================
// 4. HANK WRAPPER - Conecta HankProvider con userId del Auth
// Solo renderiza HankProvider y HankOverlay cuando hay usuario autenticado
// ============================================================================
const HankWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Si está cargando o no hay usuario, no montar HankProvider
  if (loading || !user) {
    return <>{children}</>;
  }

  return (
    <HankProvider userId={user.id}>
      {children}
      {/* HANK Overlay - Solo visible cuando hay usuario autenticado */}
      <HankOverlay />
    </HankProvider>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SportProvider>
          <HankWrapper>
            <View className="flex-1 bg-savage-black">
              <Slot />
              <StatusBar style="light" />
            </View>
          </HankWrapper>
        </SportProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
