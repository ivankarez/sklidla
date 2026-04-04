import { useState, useEffect } from 'react';
import { FlatList } from 'react-native';
import { View, Text, TextInput, Pressable } from '@/src/tw';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { searchFoods, Food } from '../../db/dao';

export default function LibraryScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);

  useEffect(() => {
    async function performSearch() {
      if (query.trim() === '') {
        setResults([]);
        return;
      }
      const items = await searchFoods(query);
      setResults(items);
    }
    const timer = setTimeout(() => performSearch(), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectFood = (food: Food) => {
    // Navigate to Verification & Adjustment screen passing the food context
    router.push({ pathname: '/verification', params: { foodId: food.id, foodName: food.name, cals: food.calories_per_100g, pro: food.protein_per_100g, car: food.carbs_per_100g, fat: food.fats_per_100g } });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center justify-center px-4 pb-4">
        <Text className="font-mono text-xl font-black text-black">DATABASE</Text>
      </View>

      <View className="px-5 pb-4 border-b-4 border-black">
        <TextInput
          className="font-mono border-2 border-black bg-black text-white p-4 text-base font-bold"
          value={query}
          onChangeText={setQuery}
          placeholder="SEARCH FOOD OR BRAND"
          placeholderTextColor="#999"
          autoFocus
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          query ? <Text className="font-mono text-sm text-black text-center mt-10">NO MATCHES FOUND.</Text> : <Text className="font-mono text-sm text-black text-center mt-10">TYPE TO SEARCH.</Text>
        }
        renderItem={({ item }) => (
          <Pressable className="flex-row justify-between items-center py-4 border-b-2 border-black" onPress={() => handleSelectFood(item)}>
            <View>
              <Text className="font-mono text-base font-bold text-black">{item.name}</Text>
              {item.brand && <Text className="font-mono text-xs text-gray-500 mt-1">{item.brand}</Text>}
            </View>
            <View className="items-end">
              <Text className="font-mono text-sm font-bold text-black">{item.calories_per_100g} kcal</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
