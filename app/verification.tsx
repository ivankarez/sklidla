import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, SafeAreaView } from '@/src/tw';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getServingSizes, logFood, getLogById, updateLog } from '../db/dao';

export default function VerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const logId = params.logId ? parseInt(params.logId as string) : null;
  const foodId = parseInt(params.foodId as string);
  
  const [foodName, setFoodName] = useState(params.foodName as string || '');
  const [cals100, setCals100] = useState(parseFloat(params.cals as string) || 0);
  const [pro100, setPro100] = useState(parseFloat(params.pro as string) || 0);
  const [car100, setCar100] = useState(parseFloat(params.car as string) || 0);
  const [fat100, setFat100] = useState(parseFloat(params.fat as string) || 0);

  const [amount, setAmount] = useState(params.initialWeight as string || '100');
  const [servings, setServings] = useState<{ id: number; name: string; weight_in_grams: number }[]>([]);
  const [activeUnit, setActiveUnit] = useState<number | null>(null); // null = grams

  useEffect(() => {
    async function loadData() {
      if (logId) {
        const log = await getLogById(logId);
        if (log) {
          setFoodName(log.name);
          setCals100(log.calories_per_100g);
          setPro100(log.protein_per_100g);
          setCar100(log.carbs_per_100g);
          setFat100(log.fats_per_100g);
          setAmount(log.amount_logged.toString());
          setActiveUnit(log.serving_size_id);
        }
      }
      
      const dbServings = await getServingSizes(foodId);
      setServings(dbServings);
    }
    if (foodId || logId) loadData();
  }, [foodId, logId]);

  const currentMultiplier = activeUnit 
    ? (servings.find(s => s.id === activeUnit)?.weight_in_grams || 100) / 100 
    : 1 / 100;
  const activeServing = activeUnit ? servings.find((s) => s.id === activeUnit) : null;
     
  const numericAmount = parseFloat(amount) || 0;
  
  const currentCals = (cals100 * currentMultiplier * numericAmount).toFixed(0);
  const currentPro = (pro100 * currentMultiplier * numericAmount).toFixed(1);
  const currentCar = (car100 * currentMultiplier * numericAmount).toFixed(1);
  const currentFat = (fat100 * currentMultiplier * numericAmount).toFixed(1);

  const handleSave = async () => {
    if (logId) {
      await updateLog(
        logId,
        activeUnit,
        numericAmount,
        parseFloat(currentCals),
        parseFloat(currentPro),
        parseFloat(currentCar),
        parseFloat(currentFat)
      );
    } else {
      await logFood(
        foodId,
        activeUnit,
        numericAmount,
        parseFloat(currentCals),
        parseFloat(currentPro),
        parseFloat(currentCar),
        parseFloat(currentFat)
      );
    }
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'top']}>
      <View className="flex-row items-center justify-between px-4 pb-4 border-b-4 border-black">
        <Pressable onPress={() => router.back()} className="p-1.5">
          <Text className="font-mono text-base font-bold text-black">[ BACK ]</Text>
        </Pressable>
        <Text className="font-mono text-xl font-black text-black">{logId ? 'EDIT LOG' : 'VERIFY LOG'}</Text>
        <View style={{ width: 70 }} />
      </View>

      <View className="flex-1 p-5">
        <View className="border-4 border-black mb-8 p-4 bg-white">
          <Text className="font-mono text-3xl font-black text-black text-center uppercase">{foodName}</Text>
        </View>
        
        <View className="flex-row justify-between mb-8 border-4 border-black">
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

        <Text className="font-mono text-base font-black text-black mb-2">AMOUNT</Text>
        <View className="border-4 border-black bg-black mb-3">
          <TextInput
            className="font-mono text-5xl font-black text-white text-center py-3"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>
        <Text className="font-mono text-xs font-bold text-black mb-8">
          CURRENT UNIT: {activeServing ? activeServing.name.toUpperCase() : 'GRAMS'}
        </Text>

        <Text className="font-mono text-base font-black text-black mb-2">UNIT</Text>
        <View className="flex-row flex-wrap gap-2">
          <Pressable 
            className={`border-4 border-black py-3 px-4 ${activeUnit === null ? 'bg-black' : 'bg-white'}`}
            onPress={() => setActiveUnit(null)}
          >
            <Text className={`font-mono text-sm font-black ${activeUnit === null ? 'text-white' : 'text-black'}`}>GRAMS</Text>
          </Pressable>
          {servings.map(s => (
            <Pressable 
              key={s.id}
              className={`border-4 border-black py-3 px-4 ${activeUnit === s.id ? 'bg-black' : 'bg-white'}`}
              onPress={() => setActiveUnit(s.id)}
            >
              <Text className={`font-mono text-sm font-black ${activeUnit === s.id ? 'text-white' : 'text-black'}`}>
                {s.name.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

      </View>

      <Pressable className="bg-black py-5 mx-5 mb-5 items-center justify-center" onPress={handleSave}>
        <Text className="font-mono text-2xl font-black text-white tracking-widest">{logId ? 'UPDATE LOG' : 'SAVE TO LOG'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
