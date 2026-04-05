import { View, Text, ScrollView, Pressable } from '@/src/tw';
import { Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { getLogsByDate, getSetting, deleteLog, LogEntry } from '../../db/dao';
import { Animated } from '@/src/tw/animated';
import { useSharedValue, withTiming, withDelay, Easing, useAnimatedStyle } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

function AnimatedProgressBar({ percent, delay = 0, label, value }: { percent: number, delay?: number, label: string, value: string }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(delay, withTiming(percent, {
      duration: 800,
      easing: Easing.out(Easing.exp)
    }));
  }, [percent, delay, width]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${width.value}%`,
    };
  });

  return (
    <View className="w-full h-12 bg-white border-4 border-black relative justify-center">
      <Animated.View 
        className="absolute left-0 top-0 bottom-0 bg-black z-0 pointer-events-none" 
        style={[{ position: 'absolute', left: 0, top: 0, bottom: 0 }, animatedStyle]}
      />

      <View className="absolute inset-0 flex-row justify-between items-center px-3 z-10 pointer-events-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        <Text className="font-mono text-base font-black" style={{ color: '#FFFFFF', mixBlendMode: 'difference' } as any}>{label}</Text>
        <Text className="font-mono text-base font-bold" style={{ color: '#FFFFFF', mixBlendMode: 'difference' } as any}>{value}</Text>
      </View>
    </View>
  );
}

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState({ cal: 2500, pro: 150, car: 200, fat: 65 });
  const [currentDate, setCurrentDate] = useState(new Date());
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  const getSqlDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = useCallback(async (date: Date) => {
    const sqlDate = getSqlDate(date);
    const dayLogs = await getLogsByDate(sqlDate);
    setLogs(dayLogs);
    
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(currentDate);
    }, [currentDate, loadData])
  );

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleDelete = async (id: number) => {
    Alert.alert('DELETE LOG', 'ARE YOU SURE?', [
      { text: 'CANCEL', style: 'cancel' },
      { text: 'DELETE', style: 'destructive', onPress: async () => {
        await deleteLog(id);
        loadData(currentDate);
      }}
    ]);
  };

  const handleEdit = (log: LogEntry) => {
    // Navigate to a verification or edit screen. For now just alert or navigate.
    // Example: router.push({ pathname: '/verification', params: { logId: log.id } });
    Alert.alert('EDIT', 'EDIT FUNCTIONALITY COMING SOON');
  };

  const totalCals = logs.reduce((sum, log) => sum + log.hardcoded_calories, 0);
  const totalPro = logs.reduce((sum, log) => sum + log.hardcoded_protein, 0);
  const totalCar = logs.reduce((sum, log) => sum + log.hardcoded_carbs, 0);
  const totalFat = logs.reduce((sum, log) => sum + log.hardcoded_fats, 0);

  const remainingCals = goals.cal - totalCals;

  const proPercent = Math.min(100, (totalPro / goals.pro) * 100);
  const carPercent = Math.min(100, (totalCar / goals.car) * 100);
  const fatPercent = Math.min(100, (totalFat / goals.fat) * 100);

  const displayDate = currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  const renderRightActions = (prog: any, drag: any, log: LogEntry) => {
    return (
      <View className="flex-row items-center h-full">
        <Pressable 
          onPress={() => handleEdit(log)} 
          className="bg-black w-20 h-full justify-center items-center border-l-4 border-white"
        >
          <MaterialIcons name="edit" size={28} color="white" />
        </Pressable>
        <Pressable 
          onPress={() => handleDelete(log.id)} 
          className="bg-black w-20 h-full justify-center items-center border-l-4 border-white"
        >
          <MaterialIcons name="delete" size={28} color="white" />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      {/* Header section with Date Navigation */}
      <View className="px-5 py-4 border-b-8 border-black mb-4 flex-row justify-between items-center">
        <Pressable onPress={goToPreviousDay} className="p-2">
          <MaterialIcons name="chevron-left" size={36} color={iconColor} />
        </Pressable>
        <Text className="font-mono text-2xl font-black text-black tracking-tighter">{displayDate}</Text>
        <Pressable onPress={goToNextDay} className="p-2">
          <MaterialIcons name="chevron-right" size={36} color={iconColor} />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-10">
        
        {/* Main Stats Area */}
        <View className="mb-10 items-center">
          <Text 
            className="font-mono font-black text-black tracking-tighter" 
            style={{ fontSize: 96, lineHeight: 96 }}
          >
            {Math.round(totalCals)}
          </Text>
          <Text className="font-mono text-sm font-bold text-black bg-black text-white px-3 py-1 mt-2">
            {remainingCals >= 0 ? `REMAINING: ${Math.round(remainingCals)} KCAL` : `OVER: ${Math.round(Math.abs(remainingCals))} KCAL`}
          </Text>
        </View>
          
        {/* Progress bars */}
        <View className="gap-4 mb-10">
          <AnimatedProgressBar 
            label="PROTEIN" 
            value={`${Math.round(totalPro)} / ${goals.pro}G`} 
            percent={proPercent} 
            delay={100} 
          />
          <AnimatedProgressBar 
            label="CARBS" 
            value={`${Math.round(totalCar)} / ${goals.car}G`} 
            percent={carPercent} 
            delay={300} 
          />
          <AnimatedProgressBar 
            label="FATS" 
            value={`${Math.round(totalFat)} / ${goals.fat}G`} 
            percent={fatPercent} 
            delay={500} 
          />
        </View>

        {/* Ledger Section */}
        <View className="mt-2">
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
              {logs.map((log) => (
                <Swipeable 
                  key={log.id}
                  renderRightActions={(prog, drag) => renderRightActions(prog, drag, log)}
                  containerStyle={{ overflow: 'hidden' }}
                >
                  <View className="flex-row justify-between items-center p-4 border-b-4 border-black bg-white">
                    <View className="flex-1 pr-4">
                      <Text className="font-mono text-lg font-black text-black leading-tight uppercase">{log.name}</Text>
                      <Text className="font-mono text-sm font-bold text-black mt-1">[{log.amount_logged} {log.serving_size_id ? 'UNITS' : 'G'}]</Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-mono text-2xl font-black text-black">{Math.round(log.hardcoded_calories)}</Text>
                      <Text className="font-mono text-xs font-bold text-black">KCAL</Text>
                    </View>
                  </View>
                </Swipeable>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
