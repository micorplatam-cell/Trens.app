import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import '../global.css';

// 1. AuthProvider
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

// 2. SportProvider (Placeholder)
const SportContext = createContext({});

export const useSport = () => useContext(SportContext);

const SportProvider = ({ children }: { children: React.ReactNode }) => {
  return <SportContext.Provider value={{}}>{children}</SportContext.Provider>;
};

// 3. AxisProvider (IA Placeholder)
const AxisContext = createContext({});

export const useAxis = () => useContext(AxisContext);

const AxisProvider = ({ children }: { children: React.ReactNode }) => {
  return <AxisContext.Provider value={{}}>{children}</AxisContext.Provider>;
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SportProvider>
          <AxisProvider>
            <View className="flex-1 bg-savage-black">
              <Slot />
              <StatusBar style="light" />
            </View>
          </AxisProvider>
        </SportProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
