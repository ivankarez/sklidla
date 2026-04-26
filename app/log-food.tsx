import { Pressable, Text, TextInput, View } from "@/src/tw";
import { Animated } from "@/src/tw/animated";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { getRandomLogMealCtaMessage, getRandomToastMessage } from "../constants/unhinged-toast";
import { addFood, addServingSize, Food, getAllFoods, getServingSizes, getSetting, logFood, searchFoods } from "@/db/dao";
import { consumePendingCreatedLogFood, consumePendingScannedLogMealItems } from "@/src/log-food-session";
import type { MealScanItemResult } from "@/utils/ai";

type ServingOption = {
  id: number | null;
  name: string;
  weight: number;
};

type SelectedFoodEntry = {
  key: string;
  source: "library" | "scan";
  foodId: number | null;
  name: string;
  brand: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  amount: string;
  unit: string;
  weight: number;
  servingSizeId: number | null;
  servingOptions: ServingOption[];
};

type ConfiguringFoodDraft = Omit<SelectedFoodEntry, "key">;

const normalizeServingOptions = (
  servingSizes: { id: number; name: string; weight_in_grams: number }[]
): ServingOption[] =>
  servingSizes.map((size) => ({
    id: size.id,
    name: size.name,
    weight: size.weight_in_grams,
  }));

const formatAmount = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "100";
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1).replace(/\.0$/, "");
};

const normalizeUnitName = (value: string): string => value.trim().toLowerCase();

const createEntryFromFood = (
  food: Food,
  servingOptions: ServingOption[],
  key: string
): SelectedFoodEntry => {
  const defaultServing = servingOptions[0] ?? null;

  return {
    key,
    source: "library",
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    calories_per_100g: food.calories_per_100g,
    protein_per_100g: food.protein_per_100g,
    carbs_per_100g: food.carbs_per_100g,
    fats_per_100g: food.fats_per_100g,
    amount: defaultServing ? "1" : "100",
    unit: defaultServing?.name ?? "grams",
    weight: defaultServing?.weight ?? 1,
    servingSizeId: defaultServing?.id ?? null,
    servingOptions,
  };
};

const createEntryFromMealScan = (item: MealScanItemResult, key: string): SelectedFoodEntry => {
  const servingOptions: ServingOption[] = item.serving_sizes.map((serving) => ({
    id: null,
    name: serving.name,
    weight: serving.weight_g,
  }));
  const normalizedUnit = normalizeUnitName(item.estimated_amount_unit);
  const matchedServing =
    servingOptions.find((option) => normalizeUnitName(option.name) === normalizedUnit) ?? null;
  const isGramUnit =
    normalizedUnit === "" ||
    normalizedUnit === "g" ||
    normalizedUnit === "gram" ||
    normalizedUnit === "grams";

  const amount = matchedServing
    ? formatAmount(item.estimated_amount)
    : isGramUnit
      ? formatAmount(item.estimated_weight_g || item.estimated_amount)
      : servingOptions.length === 1
        ? formatAmount(item.estimated_amount)
        : formatAmount(item.estimated_weight_g || item.estimated_amount);

  const selectedServing = matchedServing ?? (!isGramUnit && servingOptions.length === 1 ? servingOptions[0] : null);

  return {
    key,
    source: "scan",
    foodId: null,
    name: item.name,
    brand: item.brand ?? null,
    calories_per_100g: item.calories_per_100g,
    protein_per_100g: item.protein_per_100g,
    carbs_per_100g: item.carbs_per_100g,
    fats_per_100g: item.fats_per_100g,
    amount,
    unit: selectedServing?.name ?? "grams",
    weight: selectedServing?.weight ?? 1,
    servingSizeId: selectedServing?.id ?? null,
    servingOptions,
  };
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
  const [isAiEnabled, setIsAiEnabled] = useState(false);

  const [configuringFood, setConfiguringFood] = useState<ConfiguringFoodDraft | null>(null);
  const [amount, setAmount] = useState("100");
  const [selectedUnit, setSelectedUnit] = useState<ServingOption>({ name: "grams", weight: 1, id: null });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saveCtaLabel, setSaveCtaLabel] = useState(() => getRandomLogMealCtaMessage());
  const saveCtaOpacity = useSharedValue(0);
  const saveCtaTranslateY = useSharedValue(24);
  const showSaveCta = !configuringFood && selectedFoods.length > 0;
  const entryCounterRef = useRef(0);

  const nextEntryKey = useCallback((prefix: string) => {
    entryCounterRef.current += 1;
    return `${prefix}-${Date.now()}-${entryCounterRef.current}`;
  }, []);

  const loadFoods = useCallback(async (searchTerm: string = query) => {
    const trimmedQuery = searchTerm.trim();
    const items = trimmedQuery === "" ? await getAllFoods() : await searchFoods(trimmedQuery);
    setDbFoods(items);
  }, [query]);

  const startConfiguringEntry = useCallback((entry: ConfiguringFoodDraft, nextEditingIndex: number | null) => {
    setConfiguringFood(entry);
    setEditingIndex(nextEditingIndex);
    setAmount(entry.amount);
    setSelectedUnit({ name: entry.unit, weight: entry.weight, id: entry.servingSizeId });
  }, []);

  const handleSelectFoodForConfig = useCallback(async (food: Food) => {
    const sizes = await getServingSizes(food.id);
    const entry = createEntryFromFood(food, normalizeServingOptions(sizes), nextEntryKey(`food-${food.id}`));
    startConfiguringEntry(
      {
        ...entry,
        source: "library",
      },
      null
    );
  }, [nextEntryKey, startConfiguringEntry]);

  const handleEditSelectedFood = useCallback((index: number) => {
    const entry = selectedFoods[index];
    if (!entry) return;

    startConfiguringEntry(
      {
        source: entry.source,
        foodId: entry.foodId,
        name: entry.name,
        brand: entry.brand,
        calories_per_100g: entry.calories_per_100g,
        protein_per_100g: entry.protein_per_100g,
        carbs_per_100g: entry.carbs_per_100g,
        fats_per_100g: entry.fats_per_100g,
        amount: entry.amount,
        unit: entry.unit,
        weight: entry.weight,
        servingSizeId: entry.servingSizeId,
        servingOptions: entry.servingOptions,
      },
      index
    );
  }, [selectedFoods, startConfiguringEntry]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadFoods(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [loadFoods, query]);

  useEffect(() => {
    if (!showSaveCta) return;

    setSaveCtaLabel(getRandomLogMealCtaMessage());
    saveCtaOpacity.value = 0;
    saveCtaTranslateY.value = 24;
    saveCtaOpacity.value = withTiming(1, { duration: 180 });
    saveCtaTranslateY.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [saveCtaOpacity, saveCtaTranslateY, showSaveCta]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function syncLogFoodScreen() {
        const [aiEnabledSetting, items] = await Promise.all([
          getSetting("ai_enabled"),
          (async () => {
            const pendingCreatedFood = consumePendingCreatedLogFood();
            const nextQuery = pendingCreatedFood?.searchQuery ?? query;
            const trimmedQuery = nextQuery.trim();
            const loadedItems = trimmedQuery === "" ? await getAllFoods() : await searchFoods(trimmedQuery);

            return {
              loadedItems,
              pendingCreatedFood,
              pendingScannedItems: consumePendingScannedLogMealItems(),
              nextQuery,
            };
          })(),
        ]);

        if (!isActive) return;

        setIsAiEnabled(aiEnabledSetting === "true");
        setDbFoods(items.loadedItems);

        if (items.pendingCreatedFood?.searchQuery && items.pendingCreatedFood.searchQuery !== query) {
          setQuery(items.pendingCreatedFood.searchQuery);
        }

        if (items.pendingScannedItems && items.pendingScannedItems.length > 0) {
          setSelectedFoods((previous) => [
            ...previous,
            ...items.pendingScannedItems.map((item) =>
              createEntryFromMealScan(item, nextEntryKey(`scan-${item.name.toLowerCase()}`))
            ),
          ]);
        }

        if (items.pendingCreatedFood) {
          await handleSelectFoodForConfig(items.pendingCreatedFood.food);
        }
      }

      void syncLogFoodScreen();

      return () => {
        isActive = false;
      };
    }, [handleSelectFoodForConfig, nextEntryKey, query])
  );

  const handleConfirmAddFood = () => {
    if (!configuringFood) return;

    const nextEntry: SelectedFoodEntry = {
      key: editingIndex !== null ? selectedFoods[editingIndex]?.key ?? nextEntryKey(configuringFood.name) : nextEntryKey(configuringFood.name),
      source: configuringFood.source,
      foodId: configuringFood.foodId,
      name: configuringFood.name,
      brand: configuringFood.brand,
      calories_per_100g: configuringFood.calories_per_100g,
      protein_per_100g: configuringFood.protein_per_100g,
      carbs_per_100g: configuringFood.carbs_per_100g,
      fats_per_100g: configuringFood.fats_per_100g,
      amount,
      unit: selectedUnit.name,
      weight: selectedUnit.weight,
      servingSizeId: selectedUnit.id,
      servingOptions: configuringFood.servingOptions,
    };

    setSelectedFoods((previous) => {
      if (editingIndex === null) {
        return [...previous, nextEntry];
      }

      return previous.map((item, index) => (index === editingIndex ? nextEntry : item));
    });

    setConfiguringFood(null);
    setEditingIndex(null);
  };

  const handleRemoveSelectedFood = (indexToRemove: number) => {
    setSelectedFoods((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleCreateFood = () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    router.push({
      pathname: "/manual-entry",
      params: {
        returnTo: "log",
        name: trimmedQuery,
      },
    });
  };

  const handleOpenMealScan = () => {
    router.push({
      pathname: "/camera",
      params: {
        mode: "meal",
        source: "log-meal",
      },
    });
  };

  const handleSaveAll = async () => {
    for (const item of selectedFoods) {
      const numericAmount = parseFloat(item.amount) || 0;
      const currentMultiplier = item.weight / 100;

      const currentCals = item.calories_per_100g * currentMultiplier * numericAmount;
      const currentPro = item.protein_per_100g * currentMultiplier * numericAmount;
      const currentCar = item.carbs_per_100g * currentMultiplier * numericAmount;
      const currentFat = item.fats_per_100g * currentMultiplier * numericAmount;

      let foodId = item.foodId;
      let servingSizeId = item.servingSizeId;

      if (foodId === null) {
        foodId = await addFood({
          name: item.name,
          brand: item.brand,
          is_hidden: 1,
          calories_per_100g: item.calories_per_100g,
          protein_per_100g: item.protein_per_100g,
          carbs_per_100g: item.carbs_per_100g,
          fats_per_100g: item.fats_per_100g,
        });

        const createdServingIds = new Map<string, number>();
        for (const servingOption of item.servingOptions) {
          const createdServingId = await addServingSize(foodId, servingOption.name, servingOption.weight);
          createdServingIds.set(`${normalizeUnitName(servingOption.name)}:${servingOption.weight}`, createdServingId);
        }

        if (item.unit !== "grams") {
          servingSizeId =
            createdServingIds.get(`${normalizeUnitName(item.unit)}:${item.weight}`) ?? null;
        }
      }

      await logFood(
        foodId,
        servingSizeId,
        numericAmount,
        currentCals,
        currentPro,
        currentCar,
        currentFat
      );
    }
    router.replace({
      pathname: "/(tabs)",
      params: { toastMessage: getRandomToastMessage() },
    });
  };

  const saveCtaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: saveCtaOpacity.value,
    transform: [{ translateY: saveCtaTranslateY.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.screenBg }} edges={["top", "bottom", "left", "right"]}>
      <View className="flex-row items-center justify-between px-4 pb-4 border-b-4" style={{ borderColor: theme.border }}>
        <Pressable onPress={() => router.back()} className="p-1.5">
          <Text className="font-mono text-sm font-bold" style={{ color: theme.textPrimary }}>[X] CANCEL</Text>
        </Pressable>
        <Text className="font-mono text-xl font-black" style={{ color: theme.textPrimary }}>
          LOG MEAL
        </Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={{ maxHeight: 240, backgroundColor: theme.panelBg, borderColor: theme.border }} className="border-b-4">
        {selectedFoods.length === 0 ? (
          <View className="p-4 items-center justify-center min-h-[100px]">
            <Text className="font-mono text-sm font-bold" style={{ color: theme.textPrimary }}>NOTHING PICKED YET.</Text>
          </View>
        ) : (
          <FlatList
            data={selectedFoods}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => (
              <View className="flex-row justify-between items-center py-2 border-b-2" style={{ borderColor: theme.rowBorder }}>
                <View className="flex-1 pr-4">
                  <Text className="font-mono text-base font-bold" style={{ color: theme.textPrimary }}>
                    {item.name}
                  </Text>
                  <Text className="font-mono text-xs font-bold mt-0.5" style={{ color: theme.textSecondary }}>
                    {item.amount} {item.unit.toUpperCase()}{item.source === "scan" ? " · AI" : ""}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Pressable onPress={() => handleEditSelectedFood(index)}>
                    <Text className="font-mono text-xs font-bold" style={{ color: theme.textPrimary }}>[EDIT]</Text>
                  </Pressable>
                  <Pressable onPress={() => handleRemoveSelectedFood(index)}>
                    <Text className="font-mono text-xs font-bold" style={{ color: theme.remove }}>[REMOVE]</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>

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
              {configuringFood.servingOptions.map((size) => (
                <Pressable
                  key={`${size.name}-${size.weight}`}
                  onPress={() => setSelectedUnit(size)}
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
                onPress={() => setSelectedUnit({ name: "grams", weight: 1, id: null })}
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
              <Text className="font-mono text-xl font-black" style={{ color: theme.primaryButtonText }}>
                {editingIndex === null ? "ADD TO LOG" : "UPDATE ENTRY"}
              </Text>
            </Pressable>

            <Pressable
              className="py-4 items-center"
              onPress={() => {
                setConfiguringFood(null);
                setEditingIndex(null);
              }}
            >
              <Text className="font-mono text-base font-bold" style={{ color: theme.textPrimary }}>CANCEL</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="px-5 py-4 border-b-4" style={{ borderColor: theme.border, backgroundColor: theme.screenBg }}>
              <View className="flex-row items-stretch gap-3">
                <TextInput
                  className="font-mono border-2 p-4 text-base font-bold flex-1"
                  style={{ borderColor: theme.border, backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="SEARCH DATABASE..."
                  placeholderTextColor={theme.inputPlaceholder}
                  selectionColor={theme.primaryButtonText}
                  returnKeyType="search"
                />
                {isAiEnabled && (
                  <Pressable
                    testID="open-meal-scan"
                    accessibilityLabel="Snap meal"
                    className="items-center justify-center px-4 border-2"
                    style={{ borderColor: theme.border, backgroundColor: theme.primaryButtonBg }}
                    onPress={handleOpenMealScan}
                  >
                    <Ionicons name="camera" size={18} color={theme.primaryButtonText} />
                  </Pressable>
                )}
              </View>
            </View>

            <FlatList
              style={{ flex: 1 }}
              data={dbFoods}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: showSaveCta ? 112 : 20 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                query.trim() ? (
                  <View className="items-center mt-10 px-5">
                    <Text className="font-mono text-sm text-center mb-4" style={{ color: theme.textPrimary }}>
                      NO MATCHES. START A NEW ONE.
                    </Text>
                    <Pressable
                      className="py-3 px-6"
                      style={{ backgroundColor: theme.primaryButtonBg }}
                      onPress={handleCreateFood}
                    >
                      <Text className="font-mono text-sm font-bold" style={{ color: theme.primaryButtonText }}>
                        ADD &quot;{query.trim()}&quot;
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text className="font-mono text-sm text-center mt-10" style={{ color: theme.textPrimary }}>
                    NOTHING IN THE LIBRARY YET.
                  </Text>
                )
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

      {showSaveCta && (
        <Animated.View
          className="absolute right-0 left-0 px-5 pb-5"
          style={[{ bottom: 0 }, saveCtaAnimatedStyle]}
        >
          <Pressable
            testID="save-meal-cta"
            className="items-center justify-center py-5"
            style={{ backgroundColor: theme.primaryButtonBg }}
            onPress={handleSaveAll}
          >
            <Text className="font-mono text-xl font-black tracking-widest" style={{ color: theme.primaryButtonText }}>
              {saveCtaLabel}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
