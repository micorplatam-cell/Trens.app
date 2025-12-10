import { View, Text, FlatList } from 'react-native';

const LIQUID_DATA = [
  { id: '1', name: 'Bench Press', sets: '4x10' },
  { id: '2', name: 'Deadlift', sets: '3x5' },
  { id: '3', name: 'Squat', sets: '5x5' },
];

export default function GymScreen() {
  return (
    <View className="flex-1 bg-savage-black p-6 pt-16">
      <Text className="text-savage-text text-4xl font-bold italic mb-6">GYM</Text>

      <FlatList
        data={LIQUID_DATA}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-savage-dark p-4 mb-3 rounded border border-zinc-800 flex-row justify-between items-center">
            <Text className="text-savage-text font-bold text-lg">{item.name}</Text>
            <Text className="text-savage-red font-bold">{item.sets}</Text>
          </View>
        )}
      />
    </View>
  );
}
