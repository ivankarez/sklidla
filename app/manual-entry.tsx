import { Pressable, ScrollView, Text, TextInput, View } from '@/src/tw';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addFood, addServingSize, deleteServingSizes, getServingSizes, updateFood } from '../db/dao';

export default function ManualEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const foodIdParam = params.id ? parseInt(params.id as string) : null;
  
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [servingName, setServingName] = useState('');
  const [servingWeight, setServingWeight] = useState('');
  const [servings, setServings] = useState<{ name: string; weight: number }[]>([]);

  useEffect(() => {
    // Only populate state from params on initial mount
    if (params.name) setName(params.name as string);
    if (params.brand) setBrand(params.brand as string);
    if (params.cals) setCalories(params.cals as string);
    if (params.pro) setProtein(params.pro as string);
    if (params.car) setCarbs(params.car as string);
    if (params.fat) setFats(params.fat as string);

    if (foodIdParam) {
      async function loadServings() {
        const dbServings = await getServingSizes(foodIdParam!);
        setServings(dbServings.map(s => ({ name: s.name, weight: s.weight_in_grams })));
      }
      loadServings();
    }
  }, []); // Run only once on mount

  const handleAddServing = () => {
    if (!servingName || !servingWeight) return;
    setServings([...servings, { name: servingName, weight: parseFloat(servingWeight) }]);
    setServingName('');
    setServingWeight('');
  };

  const handleRemoveServing = (index: number) => {
    setServings(servings.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !calories || !protein || !carbs || !fats) {
      Alert.alert('MISSING DATA', 'FILL ALL BASE MACROS.');
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

      Alert.alert('SAVED', foodIdParam ? 'FOOD UPDATED.' : 'FOOD ADDED TO LIBRARY.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('ERROR', 'FAILED TO SAVE FOOD.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom', 'top']}>
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
          <Text className="font-mono text-lg font-black text-black mb-1.5">BASE STUFF</Text>
          <View className="h-1 bg-black mb-4" />
          
          <View className="mb-4">
            <Text className="font-mono text-xs font-bold text-black mb-1">FOOD NAME</Text>
            <TextInput
              className="font-mono border-2 border-black bg-white p-2.5 text-sm text-black"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chicken Breast"
              placeholderTextColor="#999"
            />
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

      <Pressable className="bg-black py-5 mx-5 mb-5 items-center justify-center" onPress={handleSave}>
        <Text className="font-mono text-xl font-black text-white tracking-widest">{foodIdParam ? 'UPDATE FOOD' : 'SAVE TO DB'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
