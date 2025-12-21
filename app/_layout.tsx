import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { HankProvider } from '../context/HankContext';
import { HankOverlay } from '../components/hank/HankOverlay';
import { SpotifyOverlay } from '../components/spotify/SpotifyOverlay';
import { ProContextProvider, useProContext } from '../context/ProContext';
import { UserRoleProvider, useUserRoleContext } from '../context/UserRoleContext';
import { useDeepLinkHandler } from '../services/share/deepLinkHandler';
import '../global.css';

// ============================================================================
// 1. AUTH PROVIDER (LEGACY - Mantener para compatibilidad)
// El nuevo UserRoleContext maneja auth + roles, pero mantenemos esto para
// no romper componentes existentes
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

// Re-export del nuevo contexto de roles
export { useUserRoleContext } from '../context/UserRoleContext';

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
// 4. PRO CONTEXT - Smart Trigger para el módulo PRO
// Re-exportamos useProContext para acceso global
// ============================================================================
export { useProContext } from '../context/ProContext';

// ============================================================================
// 4. HANK WRAPPER - Conecta HankProvider con userId del Auth
// Solo renderiza HankProvider y HankOverlay cuando hay usuario autenticado
// ============================================================================
const HankWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Manejar deep links entrantes
  useDeepLinkHandler();

  // Si está cargando o no hay usuario, no montar HankProvider
  if (loading || !user) {
    return <>{children}</>;
  }

  return (
    <HankProvider userId={user.id}>
      {children}
      {/* HANK Overlay - Visible en todas partes excepto Feed */}
      <HankOverlay />
      {/* SPOTIFY Overlay - Visible en todas partes excepto Feed */}
      <SpotifyOverlay />
    </HankProvider>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserRoleProvider>
        <AuthProvider>
          <SportProvider>
            <ProContextProvider>
              <HankWrapper>
                <View className="flex-1 bg-savage-black">
                  <Slot />
                  <StatusBar style="light" />
                </View>
              </HankWrapper>
            </ProContextProvider>
          </SportProvider>
        </AuthProvider>
      </UserRoleProvider>
    </GestureHandlerRootView>
  );
}
