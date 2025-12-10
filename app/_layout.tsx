import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import "../global.css";

// 1. AuthProvider
const AuthContext = createContext<{ session: Session | null }>({ session: null });
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return <AuthContext.Provider value={{ session }}>{children}</AuthContext.Provider>;
};

// 2. SportProvider (Placeholder)
const SportContext = createContext({});
const SportProvider = ({ children }: { children: React.ReactNode }) => {
  return <SportContext.Provider value={{}}>{children}</SportContext.Provider>;
};

// 3. AxisProvider (IA Placeholder)
const AxisContext = createContext({});
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
