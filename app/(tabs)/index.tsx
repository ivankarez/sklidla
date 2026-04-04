import { View, Text, ScrollView } from '@/src/tw';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { getTodaysLogs, getSetting, LogEntry } from '../../db/dao';
import { Animated } from '@/src/tw/animated';
import { useSharedValue, withTiming, withDelay, Easing } from 'react-native-reanimated';

function AnimatedProgressBar({ percent, delay = 0 }: { percent: number, delay?: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(delay, withTiming(percent, {
      duration: 800,
      easing: Easing.out(Easing.exp)
    }));
  }, [percent, delay, width]);

  return (
    <View className="flex-1 h-8 bg-white border-4 border-black">
      <Animated.View 
        className="h-full bg-black" 
        style={{ width: `${width.value}%` } as any} // we'll use inline style animated prop
      />
    </View>
  );
}

function BouncingStatus({ isOver, calories }: { isOver: boolean, calories: number }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Pulse animation
    opacity.value = withTiming(0.4, { duration: 500, easing: Easing.inOut(Easing.ease) });
    const interval = setInterval(() => {
      opacity.value = opacity.value === 1 ? withTiming(0.4, { duration: 500 }) : withTiming(1, { duration: 500 });
    }, 1000);
    return () => clearInterval(interval);
  }, [opacity]);

  let text = "FUEL ACQUIRED";
  if (calories === 0) text = "SYSTEM EMPTY. FEED REQUIRED.";
  else if (isOver) text = "OVERCLOCKED. MAX CAPACITY REACHED.";
  else text = "BURNING... ACQUIRE MORE FUEL.";

  return (
    <Animated.View style={{ opacity }} className="bg-black py-2 mb-6 border-y-4 border-black">
      <Text className="font-mono text-center text-white font-black tracking-widest">{text}</Text>
    </Animated.View>
  );
}

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState({ cal: 2500, pro: 150, car: 200, fat: 65 });
  
  const loadData = async () => {
    const todayLogs = await getTodaysLogs();
    setLogs(todayLogs);
    
    const cal = await getSetting('goal_calories');
    const pro = await getSetting('goal_protein');
    const car = await getSetting('goal_carbs');
    const fat = await getSetting('goal_fats');
    
    setGoals({
      cal: cal ? parseInt(cal) : 2500,
      pro: pro ? parseInt(pro) : 150,
      car: car ? parseInt(car) : 200,
      fat: fat ? parseInt(fat) : 65,
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const totalCals = logs.reduce((sum, log) => sum + log.hardcoded_calories, 0);
  const totalPro = logs.reduce((sum, log) => sum + log.hardcoded_protein, 0);
  const totalCar = logs.reduce((sum, log) => sum + log.hardcoded_carbs, 0);
  const totalFat = logs.reduce((sum, log) => sum + log.hardcoded_fats, 0);

  const proPercent = Math.min(100, (totalPro / goals.pro) * 100);
  const carPercent = Math.min(100, (totalCar / goals.car) * 100);
  const fatPercent = Math.min(100, (totalFat / goals.fat) * 100);

  const isOver = totalCals >= goals.cal;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      {/* Header section */}
      <View className="px-5 py-4 border-b-8 border-black mb-4">
        <Text className="font-mono text-4xl font-black text-black tracking-tighter">SKLIDLA</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-10">
        
        {/* Status Banner */}
        <BouncingStatus isOver={isOver} calories={totalCals} />

        {/* Main Stats Area */}
        <View className="mb-10">
          <View className="flex-row items-end justify-between mb-2">
            <Text className="font-mono text-lg font-black text-black leading-none">SYSTEM FUEL</Text>
            <Text className="font-mono text-sm font-bold text-black leading-none">{goals.cal} MAX</Text>
          </View>
          
          <View className="border-4 border-black p-4 mb-8 bg-white" style={{ boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}>
            <Text 
              className="font-mono font-black text-black tracking-tighter" 
              style={{ fontSize: 64, lineHeight: 64 }}
            >
              {Math.round(totalCals)}
            </Text>
            <Text className="font-mono text-xl font-bold text-black text-right -mt-2">KCAL</Text>
          </View>
          
          {/* Progress bars */}
          <View className="gap-6">
            <View>
              <View className="flex-row justify-between items-end mb-1">
                <Text className="font-mono text-base font-black text-black">PROTEIN</Text>
                <Text className="font-mono text-base font-bold text-black">{Math.round(totalPro)} / {goals.pro}g</Text>
              </View>
              <AnimatedProgressBar percent={proPercent} delay={100} />
            </View>
            
            <View>
              <View className="flex-row justify-between items-end mb-1">
                <Text className="font-mono text-base font-black text-black">CARBS</Text>
                <Text className="font-mono text-base font-bold text-black">{Math.round(totalCar)} / {goals.car}g</Text>
              </View>
              <AnimatedProgressBar percent={carPercent} delay={300} />
            </View>
            
            <View>
              <View className="flex-row justify-between items-end mb-1">
                <Text className="font-mono text-base font-black text-black">FATS</Text>
                <Text className="font-mono text-base font-bold text-black">{Math.round(totalFat)} / {goals.fat}g</Text>
              </View>
              <AnimatedProgressBar percent={fatPercent} delay={500} />
            </View>
          </View>
        </View>

        {/* Ledger Section */}
        <View className="flex-1 mt-4">
          <View className="flex-row items-center mb-4">
            <Text className="font-mono text-2xl font-black text-black bg-white pr-2 z-10">THE LEDGER</Text>
            <View className="flex-1 h-1 bg-black -ml-2" />
          </View>
          
          {logs.length === 0 ? (
            <View className="border-4 border-black border-dashed p-6 items-center">
              <Text className="font-mono text-base font-black text-black text-center">AWAITING INPUT...</Text>
            </View>
          ) : (
            <View className="border-4 border-black border-b-0">
              {logs.map((log, index) => (
                <View 
                  key={log.id} 
                  className="flex-row justify-between items-center p-4 border-b-4 border-black bg-white"
                >
                  <View className="flex-1 pr-4">
                    <Text className="font-mono text-lg font-black text-black leading-tight uppercase">{log.name}</Text>
                    <Text className="font-mono text-sm font-bold text-black mt-1">[{log.amount_logged} {log.serving_size_id ? 'UNITS' : 'G'}]</Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-mono text-2xl font-black text-black">{Math.round(log.hardcoded_calories)}</Text>
                    <Text className="font-mono text-xs font-bold text-black">KCAL</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
