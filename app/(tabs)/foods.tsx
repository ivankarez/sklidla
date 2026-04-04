import { Pressable, Text, TextInput, View } from "@/src/tw";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Food, searchFoods, getAllFoods } from "../../db/dao";

export default function LibraryScreen() {
  const router = useRouter();
  const { mode = "manage" } = useLocalSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);

  useEffect(() => {
    async function performSearch() {
      if (query.trim() === "") {
        const items = await getAllFoods();
        setResults(items);
        return;
      }
      const items = await searchFoods(query);
      setResults(items);
    }
    const timer = setTimeout(() => performSearch(), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectFood = (food: Food) => {
    if (mode === "select") {
      // Navigate to Verification & Adjustment screen passing the food context
      router.push({
        pathname: "/verification",
        params: {
          foodId: food.id,
          foodName: food.name,
          cals: food.calories_per_100g,
          pro: food.protein_per_100g,
          car: food.carbs_per_100g,
          fat: food.fats_per_100g,
        },
      });
    } else {
      // Navigate to Manual Entry screen for editing
      router.push({
        pathname: "/manual-entry",
        params: {
          id: food.id,
          name: food.name,
          brand: food.brand || "",
          cals: food.calories_per_100g.toString(),
          pro: food.protein_per_100g.toString(),
          car: food.carbs_per_100g.toString(),
          fat: food.fats_per_100g.toString(),
        },
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between px-4 pb-4">
        <View className="w-15" />
        <Text className="font-mono text-xl font-black text-black">
          {mode === "select" ? "SELECT FOOD" : "FOOD DATABASE"}
        </Text>
        <Pressable onPress={() => router.push("/manual-entry")} className="p-1.5">
          <Text className="font-mono text-sm font-bold text-black">[+] ADD</Text>
        </Pressable>
      </View>

      <View className="px-5 pb-4 border-b-4 border-black">
        <TextInput
          className="font-mono border-2 border-black bg-black text-white p-4 text-base font-bold"
          value={query}
          onChangeText={setQuery}
          placeholder="..."
          placeholderTextColor="#999"
          autoFocus
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          query ? (
            <View className="items-center mt-10">
              <Text className="font-mono text-sm text-black mb-4">
                NO MATCHES FOUND.
              </Text>
              <Pressable
                className="bg-black py-3 px-6"
                onPress={() =>
                  router.push({
                    pathname: "/manual-entry",
                    params: { name: query },
                  })
                }
              >
                <Text className="font-mono text-sm font-bold text-white">
                  ADD &quot;{query}&quot; MANUALLY
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text className="font-mono text-sm text-black text-center mt-10">
              DATABASE IS EMPTY.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            className="flex-row justify-between items-center py-4 border-b-2 border-black"
            onPress={() => handleSelectFood(item)}
          >
            <View>
              <Text className="font-mono text-base font-bold text-black">
                {item.name}
              </Text>
              {item.brand && (
                <Text className="font-mono text-xs text-gray-500 mt-1">
                  {item.brand}
                </Text>
              )}
            </View>
            <View className="items-end">
              <Text className="font-mono text-sm font-bold text-black">
                {item.calories_per_100g} kcal
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
