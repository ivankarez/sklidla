import { Pressable, Text, TextInput, View } from "@/src/tw";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Platform, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Food, searchFoods, getAllFoods, getServingSizes, logFood } from "../db/dao";

type SelectedFoodEntry = {
  food: Food;
  amount: string;
  unit: string;
  weight: number; // weight multiplier to grams
  servingSizeId: number | null;
};

export default function LogFoodScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark
    ? {
        screenBg: "#000000",
        panelBg: "#111111",
        textPrimary: "#FFFFFF",
        textSecondary: "#D1D5DB",
        textMuted: "#9CA3AF",
        border: "#FFFFFF",
        rowBorder: "rgba(255,255,255,0.3)",
        remove: "#F87171",
        inputBg: "#000000",
        inputText: "#FFFFFF",
        inputPlaceholder: "#6B7280",
        chipSelectedBg: "#FFFFFF",
        chipSelectedText: "#000000",
        chipUnselectedBg: "#000000",
        chipUnselectedText: "#FFFFFF",
        primaryButtonBg: "#FFFFFF",
        primaryButtonText: "#000000",
      }
    : {
        screenBg: "#FFFFFF",
        panelBg: "#F3F4F6",
        textPrimary: "#000000",
        textSecondary: "#4B5563",
        textMuted: "#6B7280",
        border: "#000000",
        rowBorder: "rgba(0,0,0,0.2)",
        remove: "#DC2626",
        inputBg: "#FFFFFF",
        inputText: "#000000",
        inputPlaceholder: "#9CA3AF",
        chipSelectedBg: "#000000",
        chipSelectedText: "#FFFFFF",
        chipUnselectedBg: "#FFFFFF",
        chipUnselectedText: "#000000",
        primaryButtonBg: "#000000",
        primaryButtonText: "#FFFFFF",
      };
  const [query, setQuery] = useState("");
  const [dbFoods, setDbFoods] = useState<Food[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<SelectedFoodEntry[]>([]);

  // Configuration state
  const [configuringFood, setConfiguringFood] = useState<Food | null>(null);
  const [servingSizes, setServingSizes] = useState<{ id: number, name: string, weight_in_grams: number }[]>([]);
  const [amount, setAmount] = useState("100");
  const [selectedUnit, setSelectedUnit] = useState<{ name: string, weight: number, id: number | null }>({ name: 'grams', weight: 1, id: null });

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
      setSelectedUnit({ name: sizes[0].name, weight: sizes[0].weight_in_grams, id: sizes[0].id });
    } else {
      setAmount("100");
      setSelectedUnit({ name: 'grams', weight: 1, id: null });
    }
  };

  const handleConfirmAddFood = () => {
    if (!configuringFood) return;
    setSelectedFoods((prev) => [
      ...prev,
      { food: configuringFood, amount, unit: selectedUnit.name, weight: selectedUnit.weight, servingSizeId: selectedUnit.id }
    ]);
    setConfiguringFood(null);
  };

  const handleRemoveSelectedFood = (indexToRemove: number) => {
    setSelectedFoods((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveAll = async () => {
    for (const item of selectedFoods) {
      const numericAmount = parseFloat(item.amount) || 0;
      const currentMultiplier = item.weight / 100;
      
      const currentCals = item.food.calories_per_100g * currentMultiplier * numericAmount;
      const currentPro = item.food.protein_per_100g * currentMultiplier * numericAmount;
      const currentCar = item.food.carbs_per_100g * currentMultiplier * numericAmount;
      const currentFat = item.food.fats_per_100g * currentMultiplier * numericAmount;

      await logFood(
        item.food.id,
        item.servingSizeId,
        numericAmount,
        currentCals,
        currentPro,
        currentCar,
        currentFat
      );
    }
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.screenBg }} edges={["top", "bottom", "left", "right"]}>
      <View className="flex-row items-center justify-between px-4 pb-4 border-b-4" style={{ borderColor: theme.border }}>
        <Pressable onPress={() => router.back()} className="p-1.5">
          <Text className="font-mono text-sm font-bold" style={{ color: theme.textPrimary }}>[X] CANCEL</Text>
        </Pressable>
        <Text className="font-mono text-xl font-black" style={{ color: theme.textPrimary }}>
          LOG FUEL
        </Text>
        <Pressable 
          onPress={handleSaveAll} 
          className="p-1.5"
        >
          <Text className="font-mono text-sm font-bold" style={{ color: theme.textPrimary }}>[+] SAVE</Text>
        </Pressable>
      </View>

      {/* Top section: Selected foods */}
      <View style={{ maxHeight: 200, backgroundColor: theme.panelBg, borderColor: theme.border }} className="border-b-4">
        {selectedFoods.length === 0 ? (
          <View className="p-4 items-center justify-center min-h-[100px]">
            <Text className="font-mono text-sm font-bold" style={{ color: theme.textPrimary }}>NO FUEL SELECTED.</Text>
          </View>
        ) : (
          <FlatList
            data={selectedFoods}
            keyExtractor={(item, index) => `${item.food.id}-${index}`}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => (
              <View className="flex-row justify-between items-center py-2 border-b-2" style={{ borderColor: theme.rowBorder }}>
                <View>
                  <Text className="font-mono text-base font-bold" style={{ color: theme.textPrimary }}>
                    {item.food.name}
                  </Text>
                  <Text className="font-mono text-xs font-bold mt-0.5" style={{ color: theme.textSecondary }}>
                    {item.amount} {item.unit.toUpperCase()}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemoveSelectedFood(index)}>
                  <Text className="font-mono text-xs font-bold" style={{ color: theme.remove }}>[REMOVE]</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {/* Bottom section: Search & DB list OR Config Form */}
      <View style={{ flex: 1, backgroundColor: theme.screenBg }}>
        {configuringFood ? (
          <View className="flex-1 p-5">
            <Text className="font-mono text-2xl font-black leading-tight uppercase mb-1" style={{ color: theme.textPrimary }}>
              {configuringFood.name}
            </Text>
            {configuringFood.brand && (
              <Text className="font-mono text-sm font-bold mb-6 uppercase" style={{ color: theme.textMuted }}>
                {configuringFood.brand}
              </Text>
            )}

            <Text className="font-mono text-base font-black mb-2" style={{ color: theme.textPrimary }}>AMOUNT</Text>
            <TextInput
              className="font-mono border-4 p-4 text-3xl font-black mb-6 text-center"
              style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor={theme.inputPlaceholder}
              selectionColor={theme.textPrimary}
              autoFocus
            />

            <Text className="font-mono text-base font-black mb-2" style={{ color: theme.textPrimary }}>UNIT</Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {servingSizes.map((size) => (
                <Pressable
                  key={size.id}
                  onPress={() => setSelectedUnit({ name: size.name, weight: size.weight_in_grams, id: size.id })}
                  className="border-4 py-3 px-4"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: selectedUnit.name === size.name ? theme.chipSelectedBg : theme.chipUnselectedBg,
                  }}
                >
                  <Text
                    className="font-mono text-base font-bold"
                    style={{ color: selectedUnit.name === size.name ? theme.chipSelectedText : theme.chipUnselectedText }}
                  >
                    {size.name.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setSelectedUnit({ name: 'grams', weight: 1, id: null })}
                className="border-4 py-3 px-4"
                style={{
                  borderColor: theme.border,
                  backgroundColor: selectedUnit.name === "grams" ? theme.chipSelectedBg : theme.chipUnselectedBg,
                }}
              >
                <Text
                  className="font-mono text-base font-bold"
                  style={{ color: selectedUnit.name === "grams" ? theme.chipSelectedText : theme.chipUnselectedText }}
                >
                  GRAMS
                </Text>
              </Pressable>
            </View>

            <Pressable className="py-5 items-center mb-4" style={{ backgroundColor: theme.primaryButtonBg }} onPress={handleConfirmAddFood}>
              <Text className="font-mono text-xl font-black" style={{ color: theme.primaryButtonText }}>ADD TO LOG</Text>
            </Pressable>

            <Pressable className="py-4 items-center" onPress={() => setConfiguringFood(null)}>
              <Text className="font-mono text-base font-bold" style={{ color: theme.textPrimary }}>CANCEL</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="px-5 py-4 border-b-4" style={{ borderColor: theme.border, backgroundColor: theme.screenBg }}>
              <TextInput
                className="font-mono border-2 p-4 text-base font-bold"
                style={{ borderColor: theme.border, backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}
                value={query}
                onChangeText={setQuery}
                placeholder="SEARCH DATABASE..."
                placeholderTextColor={theme.inputPlaceholder}
                selectionColor={theme.primaryButtonText}
                returnKeyType="search"
              />
            </View>

            <FlatList
              style={{ flex: 1 }}
              data={dbFoods}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text className="font-mono text-sm text-center mt-10" style={{ color: theme.textPrimary }}>
                  {query ? "NO MATCHES FOUND." : "DATABASE IS EMPTY."}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  className="flex-row justify-between items-center py-4 px-5 border-b-2"
                  style={{ borderColor: theme.border }}
                  onPress={() => handleSelectFoodForConfig(item)}
                >
                  <View>
                    <Text className="font-mono text-base font-bold" style={{ color: theme.textPrimary }}>
                      {item.name}
                    </Text>
                    {item.brand && (
                      <Text className="font-mono text-xs mt-1" style={{ color: theme.textMuted }}>
                        {item.brand}
                      </Text>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className="font-mono text-sm font-bold" style={{ color: theme.textPrimary }}>
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
