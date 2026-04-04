import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from '@/src/tw';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getServingSizes, logFood } from '../db/dao';

export default function VerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const foodId = parseInt(params.foodId as string);
  const foodName = params.foodName as string;
  const cals100 = parseFloat(params.cals as string);
  const pro100 = parseFloat(params.pro as string);
  const car100 = parseFloat(params.car as string);
  const fat100 = parseFloat(params.fat as string);

  const [amount, setAmount] = useState('100');
  const [servings, setServings] = useState<{ id: number; name: string; weight_in_grams: number }[]>([]);
  const [activeUnit, setActiveUnit] = useState<number | null>(null); // null = grams

  useEffect(() => {
    async function loadServings() {
      const dbServings = await getServingSizes(foodId);
      setServings(dbServings);
    }
    if (foodId) loadServings();
  }, [foodId]);

  const currentMultiplier = activeUnit 
    ? (servings.find(s => s.id === activeUnit)?.weight_in_grams || 100) / 100 
    : 1 / 100;
    
  const numericAmount = parseFloat(amount) || 0;
  
  const currentCals = (cals100 * currentMultiplier * numericAmount).toFixed(0);
  const currentPro = (pro100 * currentMultiplier * numericAmount).toFixed(1);
  const currentCar = (car100 * currentMultiplier * numericAmount).toFixed(1);
  const currentFat = (fat100 * currentMultiplier * numericAmount).toFixed(1);

  const handleSave = async () => {
    await logFood(
      foodId,
      activeUnit,
      numericAmount,
      parseFloat(currentCals),
      parseFloat(currentPro),
      parseFloat(currentCar),
      parseFloat(currentFat)
    );
    router.replace('/');
  };

  const handleAdjust = (delta: number) => {
    const current = parseFloat(amount) || 0;
    const next = Math.max(0, current + delta);
    setAmount(next.toString());
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom', 'top']}>
      <View className="flex-row items-center justify-between px-4 pb-4 border-b-4 border-black">
        <Pressable onPress={() => router.back()} className="p-1.5">
          <Text className="font-mono text-base font-bold text-black">[ ABORT ]</Text>
        </Pressable>
        <Text className="font-mono text-xl font-black text-black">VERIFY LOG</Text>
        <View className="w-17.5" />
      </View>

      <View className="flex-1 p-5">
        <Text className="font-mono text-3xl font-black text-black mb-7.5 text-center">{foodName}</Text>
        
        <View className="flex-row justify-between mb-10 border-4 border-black">
          <View className="flex-1 items-center py-4 border-r-2 border-black">
            <Text className="font-mono text-xl font-black text-black">{currentCals}</Text>
            <Text className="font-mono text-xs font-bold text-black mt-1">KCAL</Text>
          </View>
          <View className="flex-1 items-center py-4 border-r-2 border-black">
            <Text className="font-mono text-xl font-black text-black">{currentPro}g</Text>
            <Text className="font-mono text-xs font-bold text-black mt-1">PRO</Text>
          </View>
          <View className="flex-1 items-center py-4 border-r-2 border-black">
            <Text className="font-mono text-xl font-black text-black">{currentCar}g</Text>
            <Text className="font-mono text-xs font-bold text-black mt-1">CAR</Text>
          </View>
          <View className="flex-1 items-center py-4">
            <Text className="font-mono text-xl font-black text-black">{currentFat}g</Text>
            <Text className="font-mono text-xs font-bold text-black mt-1">FAT</Text>
          </View>
        </View>

        <Text className="font-mono text-base font-black text-black mb-2.5">AMOUNT</Text>
        <View className="flex-row items-center justify-between mb-7.5">
          <Pressable className="w-15 h-15 bg-black items-center justify-center" onPress={() => handleAdjust(-10)}>
            <Text className="font-mono text-4xl font-black text-white leading-10">-</Text>
          </Pressable>
          <TextInput
            className="flex-1 h-15 border-y-4 border-black font-mono text-3xl font-black text-black text-center"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <Pressable className="w-15 h-15 bg-black items-center justify-center" onPress={() => handleAdjust(10)}>
            <Text className="font-mono text-4xl font-black text-white leading-10">+</Text>
          </Pressable>
        </View>

        <Text className="font-mono text-base font-black text-black mb-2.5">UNIT</Text>
        <View className="flex-row flex-wrap gap-2.5">
          <Pressable 
            className={`border-2 border-black py-2.5 px-4 ${activeUnit === null ? 'bg-black' : ''}`}
            onPress={() => setActiveUnit(null)}
          >
            <Text className={`font-mono text-sm font-bold ${activeUnit === null ? 'text-white' : 'text-black'}`}>GRAMS</Text>
          </Pressable>
          {servings.map(s => (
            <Pressable 
              key={s.id}
              className={`border-2 border-black py-2.5 px-4 ${activeUnit === s.id ? 'bg-black' : ''}`}
              onPress={() => setActiveUnit(s.id)}
            >
              <Text className={`font-mono text-sm font-bold ${activeUnit === s.id ? 'text-white' : 'text-black'}`}>
                {s.name.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

      </View>

      <Pressable className="bg-black py-5 mx-5 mb-5 items-center justify-center" onPress={handleSave}>
        <Text className="font-mono text-2xl font-black text-white tracking-widest">SAVE TO LOG</Text>
      </Pressable>
    </SafeAreaView>
  );
}
