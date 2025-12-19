import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, User, Crosshair, Dumbbell, Play } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#27272a',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#71717a',
        tabBarShowLabel: false,
      }}
    >
      {/* FEED - Pantalla principal según MASTER */}
      <Tabs.Screen
        name="feed/index"
        options={{
          tabBarIcon: ({ color }) => <Play color={color} size={28} fill={color} />,
        }}
      />

      {/* NUCLEO - Selección de arena */}
      <Tabs.Screen
        name="nucleo/index"
        options={{
          tabBarIcon: ({ color }) => <Home color={color} size={28} />,
        }}
      />

      {/* PRO - Botón central de cámara */}
      <Tabs.Screen
        name="pro/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View
              className={`p-4 rounded-full ${focused ? 'bg-savage-red' : 'bg-zinc-800'}`}
              style={{
                marginBottom: 20,
                shadowColor: focused ? '#DC2626' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: focused ? 0.5 : 0,
                shadowRadius: 8,
                elevation: focused ? 8 : 0,
              }}
            >
              <Crosshair color="#FFFFFF" size={32} />
            </View>
          ),
        }}
      />

      {/* GYM - Ejercicios */}
      <Tabs.Screen
        name="gym/index"
        options={{
          tabBarIcon: ({ color }) => <Dumbbell color={color} size={28} />,
        }}
      />

      {/* ADN - Perfil + Bóveda */}
      <Tabs.Screen
        name="adn/index"
        options={{
          tabBarIcon: ({ color }) => <User color={color} size={28} />,
        }}
      />

      {/* PLAN - Oculto por ahora */}
      <Tabs.Screen
        name="plan/index"
        options={{
          href: null, // Ocultar del tab bar
        }}
      />
    </Tabs>
  );
}
