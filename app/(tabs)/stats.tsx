import { ScrollView, Text, View } from '@/src/tw';
import { getLast7DayNutritionAverages, getLoggingStreak } from '@/db/dao';
import type { NutritionAverages } from '@/db/stats';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EMPTY_AVERAGES: NutritionAverages = {
  averageCalories: 0,
  averageProtein: 0,
  averageCarbs: 0,
  averageFats: 0,
  daysLogged: 0,
};

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View className="w-[48%] border-4 border-black bg-white px-4 py-5 mb-4">
      <Text className="font-mono text-xs font-black text-black mb-3">{label}</Text>
      <Text className="font-mono text-4xl font-black text-black tracking-tighter">{value}</Text>
      <Text className="font-mono text-xs font-bold text-black mt-2">{unit}</Text>
    </View>
  );
}

const formatAverage = (value: number, decimals: number = 1) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(decimals);
};

export default function StatsScreen() {
  const [streak, setStreak] = useState(0);
  const [averages, setAverages] = useState<NutritionAverages>(EMPTY_AVERAGES);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);

    try {
      const [nextStreak, nextAverages] = await Promise.all([
        getLoggingStreak(),
        getLast7DayNutritionAverages(),
      ]);

      setStreak(nextStreak);
      setAverages(nextAverages);
    } catch (error) {
      console.error('Failed to load statistics', error);
      Alert.alert('ERROR', 'FAILED TO LOAD STATS.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Text className="font-mono text-xl font-black text-black text-center">COUNTING THE CHAOS...</Text>
      </View>
    );
  }

  const hasAverages = averages.daysLogged > 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View className="items-center py-2.5 mb-2.5">
        <Text className="font-mono text-xl font-black text-black">STATS</Text>
      </View>

      <ScrollView contentContainerClassName="p-5 pb-10">
        <View className="mb-10">
          <Text className="font-mono text-xl font-black text-black mb-1.5">CURRENT STREAK</Text>
          <View className="h-1 bg-black mb-5" />

          <View className="border-4 border-black bg-black px-6 py-8 items-center">
            <Text
              className="font-mono font-black text-white tracking-tighter"
              style={{ fontSize: 88, lineHeight: 88 }}
            >
              {streak}
            </Text>
            <Text className="font-mono text-base font-black text-white mt-3">DAYS IN A ROW</Text>
          </View>

          <Text className="font-mono text-sm font-bold text-black mt-4">
            {streak > 0 ? 'YOU KEEP SHOWING UP.' : 'LOG TODAY. WAKE THE STREAK UP.'}
          </Text>
        </View>

        <View>
          <Text className="font-mono text-xl font-black text-black mb-1.5">LAST 7 DAYS</Text>
          <View className="h-1 bg-black mb-3" />
          <Text className="font-mono text-xs font-bold text-black mb-5">
            {hasAverages
              ? `AVERAGED ACROSS ${averages.daysLogged} LOGGED ${averages.daysLogged === 1 ? 'DAY' : 'DAYS'}`
              : 'NO LOGS YET. THE MATH IS STARVING.'}
          </Text>

          <View className="flex-row flex-wrap justify-between">
            <StatCard
              label="CALORIES"
              value={formatAverage(Math.round(averages.averageCalories), 0)}
              unit="AVG KCAL / DAY"
            />
            <StatCard
              label="PROTEIN"
              value={formatAverage(averages.averageProtein)}
              unit="AVG G / DAY"
            />
            <StatCard
              label="CARBS"
              value={formatAverage(averages.averageCarbs)}
              unit="AVG G / DAY"
            />
            <StatCard
              label="FATS"
              value={formatAverage(averages.averageFats)}
              unit="AVG G / DAY"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
