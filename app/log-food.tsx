import { Pressable, Text, TextInput, View } from "@/src/tw";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Food, searchFoods, getAllFoods, getServingSizes } from "../db/dao";

type SelectedFoodEntry = {
  food: Food;
  amount: string;
  unit: string;
  weight: number; // weight multiplier to grams
};

export default function LogFoodScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dbFoods, setDbFoods] = useState<Food[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<SelectedFoodEntry[]>([]);

  // Configuration state
  const [configuringFood, setConfiguringFood] = useState<Food | null>(null);
  const [servingSizes, setServingSizes] = useState<{ id: number, name: string, weight_in_grams: number }[]>([]);
  const [amount, setAmount] = useState("100");
  const [selectedUnit, setSelectedUnit] = useState<{ name: string, weight: number }>({ name: 'grams', weight: 1 });

  useEffect(() => {
    async function performSearch() {
      if (query.trim() === "") {
        const items = await getAllFoods();
        setDbFoods(items);
        return;
      }
      const items = await searchFoods(query);
      setDbFoods(items);
    }
    const timer = setTimeout(() => performSearch(), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectFoodForConfig = async (food: Food) => {
    const sizes = await getServingSizes(food.id);
    setServingSizes(sizes);
    setConfiguringFood(food);
    if (sizes.length > 0) {
      setAmount("1");
      setSelectedUnit({ name: sizes[0].name, weight: sizes[0].weight_in_grams });
    } else {
      setAmount("100");
      setSelectedUnit({ name: 'grams', weight: 1 });
    }
  };

  const handleConfirmAddFood = () => {
    if (!configuringFood) return;
    setSelectedFoods((prev) => [
      ...prev,
      { food: configuringFood, amount, unit: selectedUnit.name, weight: selectedUnit.weight }
    ]);
    setConfiguringFood(null);
  };

  const handleRemoveSelectedFood = (indexToRemove: number) => {
    setSelectedFoods((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={["top", "bottom", "left", "right"]}>
      <View className="flex-row items-center justify-between px-4 pb-4 border-b-4 border-black">
        <Pressable onPress={() => router.back()} className="p-1.5">
          <Text className="font-mono text-sm font-bold text-black">[X] CANCEL</Text>
        </Pressable>
        <Text className="font-mono text-xl font-black text-black">
          LOG FUEL
        </Text>
        <Pressable 
          onPress={() => router.back()} 
          className="p-1.5"
        >
          <Text className="font-mono text-sm font-bold text-black">[+] SAVE</Text>
        </Pressable>
      </View>

      {/* Top section: Selected foods */}
      <View style={{ maxHeight: 200, backgroundColor: '#f3f4f6' }} className="border-b-4 border-black">
        {selectedFoods.length === 0 ? (
          <View className="p-4 items-center justify-center min-h-[100px]">
            <Text className="font-mono text-sm text-black font-bold">NO FUEL SELECTED.</Text>
          </View>
        ) : (
          <FlatList
            data={selectedFoods}
            keyExtractor={(item, index) => `${item.food.id}-${index}`}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => (
              <View className="flex-row justify-between items-center py-2 border-b-2 border-black/20">
                <View>
                  <Text className="font-mono text-base font-bold text-black">
                    {item.food.name}
                  </Text>
                  <Text className="font-mono text-xs font-bold text-gray-600 mt-0.5">
                    {item.amount} {item.unit.toUpperCase()}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemoveSelectedFood(index)}>
                  <Text className="font-mono text-xs font-bold text-red-600">[REMOVE]</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {/* Bottom section: Search & DB list OR Config Form */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {configuringFood ? (
          <View className="flex-1 p-5">
            <Text className="font-mono text-2xl font-black text-black leading-tight uppercase mb-1">
              {configuringFood.name}
            </Text>
            {configuringFood.brand && (
              <Text className="font-mono text-sm font-bold text-gray-500 mb-6 uppercase">
                {configuringFood.brand}
              </Text>
            )}

            <Text className="font-mono text-base font-black text-black mb-2">AMOUNT</Text>
            <TextInput
              className="font-mono border-4 border-black bg-white text-black p-4 text-3xl font-black mb-6 text-center"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              autoFocus
            />

            <Text className="font-mono text-base font-black text-black mb-2">UNIT</Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {servingSizes.map((size) => (
                <Pressable
                  key={size.id}
                  onPress={() => setSelectedUnit({ name: size.name, weight: size.weight_in_grams })}
                  className={`border-4 border-black py-3 px-4 ${selectedUnit.name === size.name ? 'bg-black' : 'bg-white'}`}
                >
                  <Text className={`font-mono text-base font-bold ${selectedUnit.name === size.name ? 'text-white' : 'text-black'}`}>
                    {size.name.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setSelectedUnit({ name: 'grams', weight: 1 })}
                className={`border-4 border-black py-3 px-4 ${selectedUnit.name === 'grams' ? 'bg-black' : 'bg-white'}`}
              >
                <Text className={`font-mono text-base font-bold ${selectedUnit.name === 'grams' ? 'text-white' : 'text-black'}`}>
                  GRAMS
                </Text>
              </Pressable>
            </View>

            <Pressable className="bg-black py-5 items-center mb-4" onPress={handleConfirmAddFood}>
              <Text className="font-mono text-xl font-black text-white">ADD TO LOG</Text>
            </Pressable>

            <Pressable className="py-4 items-center" onPress={() => setConfiguringFood(null)}>
              <Text className="font-mono text-base font-bold text-black">CANCEL</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="px-5 py-4 border-b-4 border-black bg-white">
              <TextInput
                className="font-mono border-2 border-black bg-black text-white p-4 text-base font-bold"
                value={query}
                onChangeText={setQuery}
                placeholder="SEARCH DATABASE..."
                placeholderTextColor="#999"
                returnKeyType="search"
              />
            </View>

            <FlatList
              style={{ flex: 1 }}
              data={dbFoods}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text className="font-mono text-sm text-black text-center mt-10">
                  {query ? "NO MATCHES FOUND." : "DATABASE IS EMPTY."}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  className="flex-row justify-between items-center py-4 border-b-2 border-black"
                  onPress={() => handleSelectFoodForConfig(item)}
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
          </>
        )}
      </View>
    </SafeAreaView>
  );
}