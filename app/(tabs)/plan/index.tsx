import { View, Text, ScrollView } from 'react-native';

export default function PlanScreen() {
  return (
    <View className="flex-1 bg-savage-black p-6 pt-16">
      <Text className="text-savage-text text-4xl font-bold italic mb-6">PLAN</Text>

      <ScrollView>
        {['08:00 - Breakfast', '12:00 - Lunch', '16:00 - Snack', '20:00 - Dinner'].map((item, index) => (
           <View key={index} className="flex-row items-center mb-6">
             <View className="w-2 h-full bg-zinc-800 mr-4 items-center">
                <View className="w-4 h-4 rounded-full bg-savage-red" />
             </View>
             <View className="flex-1 bg-savage-dark p-4 rounded border border-zinc-800">
                <Text className="text-savage-text font-bold">{item}</Text>
             </View>
           </View>
        ))}
      </ScrollView>
    </View>
  );
}
