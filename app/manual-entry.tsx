import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from '@/src/tw';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, useColorScheme } from 'react-native';
import { getRandomLibraryToastMessage } from '../constants/unhinged-toast';
import { addFood, addServingSize, deleteServingSizes, getServingSizes, getSetting, updateFood } from '@/db/dao';
import { setPendingCreatedLogFood } from '@/src/log-food-session';
import { processFoodNameAutofill } from '../utils/ai';

export default function ManualEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const foodIdParam = params.id ? parseInt(params.id as string) : null;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const cameraIconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const libraryMode = Array.isArray(params.libraryMode) ? params.libraryMode[0] : params.libraryMode;
  
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [servingName, setServingName] = useState('');
  const [servingWeight, setServingWeight] = useState('');
  const [servings, setServings] = useState<{ name: string; weight: number }[]>([]);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isNameAiLoading, setIsNameAiLoading] = useState(false);
  const isNameAiDisabled = !name.trim() || isNameAiLoading;

  useEffect(() => {
    const parseNumericParam = (value: unknown): string => {
      if (value === undefined || value === null) return '';
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return '';
      return numeric.toString();
    };
    const parseServingSuggestions = (value: unknown): { name: string; weight: number }[] => {
      if (!value) return [];
      try {
        const raw = Array.isArray(value) ? value.join('') : String(value);
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((item) => {
            const itemName = typeof item?.name === 'string' ? item.name.trim() : '';
            const itemWeight = Number(item?.weight);
            if (!itemName || !Number.isFinite(itemWeight) || itemWeight <= 0) return null;
            return { name: itemName, weight: itemWeight };
          })
          .filter((item): item is { name: string; weight: number } => item !== null);
      } catch {
        return [];
      }
    };

    if (params.name) setName(params.name as string);
    if (params.brand) setBrand(params.brand as string);
    if (params.cals) setCalories(parseNumericParam(params.cals));
    if (params.pro) setProtein(parseNumericParam(params.pro));
    if (params.car) setCarbs(parseNumericParam(params.car));
    if (params.fat) setFats(parseNumericParam(params.fat));

    const aiServingSuggestions = parseServingSuggestions(params.aiServings);
    if (aiServingSuggestions.length > 0) {
      setServings(aiServingSuggestions);
    } else if (params.aiServingName && params.aiServingWeight) {
      const suggestedWeight = Number(params.aiServingWeight);
      const suggestedName = String(params.aiServingName).trim();
      if (suggestedName && Number.isFinite(suggestedWeight) && suggestedWeight > 0) {
        setServings([{ name: suggestedName, weight: suggestedWeight }]);
      }
    }

    if (foodIdParam) {
      async function loadServings() {
        const dbServings = await getServingSizes(foodIdParam!);
        if (!params.aiServings && !params.aiServingName && !params.aiServingWeight) {
          setServings(dbServings.map(s => ({ name: s.name, weight: s.weight_in_grams })));
        }
      }
      loadServings();
    }

    async function loadAiAvailability() {
      const enabled = await getSetting('ai_enabled');
      setIsAiEnabled(enabled === 'true');
    }
    loadAiAvailability();
  }, [
    foodIdParam,
    params.aiServingName,
    params.aiServingWeight,
    params.aiServings,
    params.brand,
    params.car,
    params.cals,
    params.fat,
    params.name,
    params.pro,
  ]);

  const handleAddServing = () => {
    if (!servingName || !servingWeight) return;
    setServings([...servings, { name: servingName, weight: parseFloat(servingWeight) }]);
    setServingName('');
    setServingWeight('');
  };

  const handleRemoveServing = (index: number) => {
    setServings(servings.filter((_, i) => i !== index));
  };

  const handleAiScan = () => {
    router.push({
      pathname: '/camera',
      params: {
        mode: 'auto',
        source: 'manual-entry',
        nameHint: name.trim() || undefined,
        brandHint: brand.trim() || undefined,
      },
    });
  };

  const handleNameAiAutofill = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isNameAiLoading) return;

    const toNullableMetric = (value: string): number | null => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric) || numeric < 0) return null;
      return numeric;
    };

    try {
      setIsNameAiLoading(true);
      const result = await processFoodNameAutofill({
        name: trimmedName,
        brand: brand.trim() || null,
        calories_per_100g: toNullableMetric(calories),
        protein_per_100g: toNullableMetric(protein),
        carbs_per_100g: toNullableMetric(carbs),
        fats_per_100g: toNullableMetric(fats),
        serving_sizes: servings.length > 0
          ? servings.map((item) => ({ name: item.name, weight_g: item.weight }))
          : null,
      });
      if (!result) return;

      const asMetricString = (value: number | null): string => {
        if (value === null || value === undefined) return '';
        if (!Number.isFinite(value) || value < 0) return '';
        return value.toString();
      };

      if (!brand.trim() && result.brand) {
        setBrand(result.brand);
      }
      if (!calories.trim() && result.calories_per_100g !== null) {
        setCalories(asMetricString(result.calories_per_100g));
      }
      if (!protein.trim() && result.protein_per_100g !== null) {
        setProtein(asMetricString(result.protein_per_100g));
      }
      if (!carbs.trim() && result.carbs_per_100g !== null) {
        setCarbs(asMetricString(result.carbs_per_100g));
      }
      if (!fats.trim() && result.fats_per_100g !== null) {
        setFats(asMetricString(result.fats_per_100g));
      }

      if (servings.length === 0 && result.serving_sizes && result.serving_sizes.length > 0) {
        setServings(result.serving_sizes.map((item) => ({ name: item.name, weight: item.weight_g })));
      }
    } finally {
      setIsNameAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !calories || !protein || !carbs || !fats) {
      Alert.alert('NEED THE NUMBERS', 'ADD CALORIES, PROTEIN, CARBS, AND FATS.');
      return;
    }

    try {
      const foodData = {
        name,
        brand: brand || null,
        calories_per_100g: parseFloat(calories),
        protein_per_100g: parseFloat(protein),
        carbs_per_100g: parseFloat(carbs),
        fats_per_100g: parseFloat(fats),
      };

      let foodId: number;
      if (foodIdParam) {
        await updateFood(foodIdParam, foodData);
        await deleteServingSizes(foodIdParam);
        foodId = foodIdParam;
      } else {
        foodId = await addFood(foodData);
      }

      for (const serving of servings) {
        await addServingSize(foodId, serving.name, serving.weight);
      }

      if (returnTo === 'library') {
        router.replace({
          pathname: '/(tabs)/foods',
          params: {
            mode: libraryMode === 'select' ? 'select' : 'manage',
            toastMessage: getRandomLibraryToastMessage(),
          },
        });
        return;
      }

      if (returnTo === 'log') {
        if (!foodIdParam) {
          setPendingCreatedLogFood({
            food: {
              id: foodId,
              ...foodData,
            },
            searchQuery: foodData.name,
          });
        }
        router.back();
        return;
      }

      router.back();
    } catch {
      Alert.alert('ERROR', 'COULD NOT SAVE THAT FOOD.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View className="flex-row items-center justify-between p-4 border-b-4 border-black">
        <Pressable onPress={() => router.back()} className="p-1.5">
          <Text className="font-mono text-sm font-bold text-black">[ BACK ]</Text>
        </Pressable>
        <Text className="font-mono text-xl font-black text-black">{foodIdParam ? 'EDIT FOOD' : 'ADD FOOD'}</Text>
        <View className="w-15" />
      </View>

      <ScrollView contentContainerClassName="p-5 pb-5">
        <View className="mb-7.5">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="font-mono text-lg font-black text-black">THE BASICS</Text>
            {isAiEnabled && !foodIdParam && (
              <Pressable
                onPress={handleAiScan}
                className={`px-2 py-1 border-2 flex-row items-center ${isDark ? 'border-white' : 'border-black'}`}
              >
                <Ionicons name="camera" size={14} color={cameraIconColor} />
                <Text className="font-mono text-xs font-black text-black ml-1">SNAP PHOTO</Text>
              </Pressable>
            )}
          </View>
          <View className="h-1 bg-black mb-4" />
          
          <View className="mb-4">
            <Text className="font-mono text-xs font-bold text-black mb-1">FOOD NAME</Text>
            <View className="flex-row">
              <TextInput
                className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black flex-1"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Chicken Breast"
                placeholderTextColor="#999"
              />
              {isAiEnabled && !foodIdParam && (
                <Pressable
                  onPress={handleNameAiAutofill}
                  disabled={isNameAiDisabled}
                  className="ml-2 px-3 justify-center border-2"
                  style={{
                    backgroundColor: isNameAiDisabled
                      ? (isDark ? '#2A2A2A' : '#ffffff')
                      : (isDark ? '#FFFFFF' : '#000000'),
                    borderColor: isDark ? '#FFFFFF' : '#000000',
                  }}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={isNameAiDisabled ? (isDark ? '#7A7A7A' : '#4A4A4A') : (isDark ? '#000000' : '#FFFFFF')}
                  />
                </Pressable>
              )}
            </View>
          </View>
          <View className="mb-4">
            <Text className="font-mono text-xs font-bold text-black mb-1">BRAND (OPTIONAL)</Text>
            <TextInput
              className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black"
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Tyson"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View className="mb-7.5">
          <Text className="font-mono text-lg font-black text-black mb-1.5">MACROS PER 100g</Text>
          <View className="h-1 bg-black mb-4" />

          <View className="flex-row">
            <View className="flex-1 mr-2.5 mb-4">
              <Text className="font-mono text-xs font-bold text-black mb-1">CALORIES</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black"
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            <View className="flex-1 mr-2.5 mb-4">
              <Text className="font-mono text-xs font-bold text-black mb-1">PRO (g)</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black"
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            <View className="flex-1 mr-2.5 mb-4">
              <Text className="font-mono text-xs font-bold text-black mb-1">CAR (g)</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black"
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            <View className="flex-1 mb-4">
              <Text className="font-mono text-xs font-bold text-black mb-1">FAT (g)</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black"
                value={fats}
                onChangeText={setFats}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        <View>
          <Text className="font-mono text-lg font-black text-black mb-1.5">SERVING SIZES</Text>
          <View className="h-1 bg-black mb-4" />
          
          {servings.map((s, i) => (
            <View key={i} className="p-2.5 border-2 border-black mb-2.5 flex-row justify-between items-center">
              <Text className="font-mono text-sm font-bold text-black">{s.name} = {s.weight}g</Text>
              <Pressable onPress={() => handleRemoveServing(i)}>
                <Text className="font-mono text-xs font-bold text-gray-400">[REMOVE]</Text>
              </Pressable>
            </View>
          ))}

          <View className="flex-row">
            <View className="flex-[2] mr-2.5 mb-4">
              <Text className="font-mono text-xs font-bold text-black mb-1">UNIT NAME</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black"
                value={servingName}
                onChangeText={setServingName}
                placeholder="e.g. slice"
                placeholderTextColor="#999"
              />
            </View>
            <View className="flex-1 mr-2.5 mb-4">
              <Text className="font-mono text-xs font-bold text-black mb-1">WEIGHT (g)</Text>
              <TextInput
                className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black"
                value={servingWeight}
                onChangeText={setServingWeight}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor="#999"
              />
            </View>
            <View className="justify-end mb-4">
              <Pressable className="bg-black p-2.5 h-10.5 justify-center" onPress={handleAddServing}>
                <Text className="font-mono text-sm font-bold text-white">ADD</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <Pressable className="bg-black py-5 mx-5 mb-5 items-center justify-center" onPress={handleSave} disabled={isNameAiLoading}>
        <Text className="font-mono text-xl font-black text-white tracking-widest">{foodIdParam ? 'UPDATE FOOD' : 'SAVE TO LIBRARY'}</Text>
      </Pressable>

      {isNameAiLoading && (
        <View
          className="absolute top-0 right-0 bottom-0 left-0 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        >
          <View
            className="px-6 py-5 items-center"
            style={{ backgroundColor: '#000000', borderColor: '#FFFFFF', borderWidth: 4 }}
          >
            <Ionicons name="sparkles" size={22} color="#FFFFFF" />
            <Text className="font-mono text-base font-black mt-2" style={{ color: '#FFFFFF' }}>THINKING...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
