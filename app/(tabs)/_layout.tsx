import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, User, Camera, Dumbbell, Calendar } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#1A1A1A',
          height: 80,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#666666',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="nucleo/index"
        options={{
          tabBarIcon: ({ color }) => <Home color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="adn/index"
        options={{
          tabBarIcon: ({ color }) => <User color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="pro/index"
        options={{
          tabBarIcon: () => (
            <View className="bg-savage-red p-3 rounded-full -mt-8 border-4 border-savage-black">
                <Camera color="#FFFFFF" size={32} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gym/index"
        options={{
          tabBarIcon: ({ color }) => <Dumbbell color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="plan/index"
        options={{
          tabBarIcon: ({ color }) => <Calendar color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}
