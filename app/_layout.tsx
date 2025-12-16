import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AxisProvider } from '../context/AxisContext';
import { AxisOverlay } from '../components/axis/AxisOverlay';
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
// 3. AXIS PROVIDER - Importado desde context/AxisContext.tsx
// Re-exportamos useAxis para acceso global
// ============================================================================
export { useAxis } from '../context/AxisContext';

// ============================================================================
// 4. AXIS WRAPPER - Conecta AxisProvider con userId del Auth
// ============================================================================
const AxisWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return <AxisProvider userId={user?.id ?? null}>{children}</AxisProvider>;
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SportProvider>
          <AxisWrapper>
            <View className="flex-1 bg-savage-black">
              <Slot />
              <StatusBar style="light" />
              {/* AXIS Overlay - Flota sobre todas las pantallas */}
              <AxisOverlay />
            </View>
          </AxisWrapper>
        </SportProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
