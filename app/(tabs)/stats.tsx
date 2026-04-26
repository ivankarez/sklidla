import { ScrollView, Text, View, Pressable } from '@/src/tw';
import {
  getLast7DayCalorieGoalStatuses,
  getLast7DayNutritionAverages,
  getLoggingStreak,
  getWeightHistory,
} from '@/db/dao';
import {
  buildSvgLinePath,
  buildWeightChartPoints,
  summarizeWeightChange,
  type Last7DayCalorieGoalStatus,
  type WeightHistoryPoint,
  type WeightTimeframe,
  type NutritionAverages,
} from '@/db/stats';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, useColorScheme } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const EMPTY_AVERAGES: NutritionAverages = {
  averageCalories: 0,
  averageProtein: 0,
  averageCarbs: 0,
  averageFats: 0,
  daysLogged: 0,
};

const TIMEFRAME_OPTIONS: { id: WeightTimeframe; label: string; helper: string }[] = [
  { id: '30d', label: '30D', helper: 'LAST 30 DAYS' },
  { id: '1y', label: '1Y', helper: 'LAST YEAR' },
  { id: 'all', label: 'ALL', helper: 'ALL TIME' },
];

const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;

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

function TimeframeButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`flex-1 border-2 border-black p-3 items-center ${selected ? 'bg-black' : 'bg-white'}`}
      onPress={onPress}
    >
      <Text className={`font-mono text-xs font-black ${selected ? 'text-white' : 'text-black'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function StreakDayDot({ status }: { status: Last7DayCalorieGoalStatus['status'] }) {
  const symbol = status === 'met' ? '\u2713' : status === 'over' ? 'X' : '';
  const isFilled = status !== 'no_logs';

  return (
    <View
      accessibilityLabel={`streak-day-${status}`}
      className={`w-7 h-7 rounded-full border-2 border-black items-center justify-center ${
        isFilled ? 'bg-black' : 'bg-white'
      }`}
    >
      <Text className={`font-mono text-xs font-black ${isFilled ? 'text-white' : 'text-black'}`}>
        {symbol}
      </Text>
    </View>
  );
}

function WeightChart({ points, isDark }: { points: WeightHistoryPoint[]; isDark: boolean }) {
  const chartSurfaceColor = isDark ? '#000000' : '#FFFFFF';
  const chartBorderColor = isDark ? '#FFFFFF' : '#000000';
  const chartTextColor = isDark ? '#FFFFFF' : '#000000';
  const chartLineColor = isDark ? '#FFFFFF' : '#000000';
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedPointIndex(points.length > 0 ? points.length - 1 : null);
  }, [points]);

  if (points.length === 0) {
    return (
      <View
        className="border-4 px-5 py-10 items-center"
        style={{ borderColor: chartBorderColor, backgroundColor: chartSurfaceColor }}
      >
        <Text className="font-mono text-lg font-black text-center" style={{ color: chartTextColor }}>
          NO WEIGH-INS YET.
        </Text>
        <Text className="font-mono text-xs font-bold mt-3 text-center" style={{ color: chartTextColor }}>
          CHANGE YOUR WEIGHT IN SETTINGS AND THE GRAPH STARTS TELLING ON YOU.
        </Text>
      </View>
    );
  }

  const chartPoints = buildWeightChartPoints(points, CHART_WIDTH, CHART_HEIGHT, 18);
  const pathData = buildSvgLinePath(chartPoints);
  const weights = points.map((point) => point.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const selectedPoint = selectedPointIndex !== null ? chartPoints[selectedPointIndex] : null;
  const selectedWeight = selectedPointIndex !== null ? points[selectedPointIndex]?.weight : null;
  const tooltipLabel = selectedWeight !== null ? `${formatWeight(selectedWeight)} KG` : null;
  const tooltipWidth = tooltipLabel ? Math.max(72, tooltipLabel.length * 7 + 18) : 0;
  const tooltipX =
    selectedPoint && tooltipLabel
      ? Math.min(Math.max(selectedPoint.x - tooltipWidth / 2, 8), CHART_WIDTH - tooltipWidth - 8)
      : 0;
  const tooltipY = selectedPoint ? Math.max(selectedPoint.y - 34, 8) : 0;

  return (
    <View
      className="border-4 p-4"
      style={{ borderColor: chartBorderColor, backgroundColor: chartSurfaceColor }}
    >
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-mono text-xs font-black" style={{ color: chartTextColor }}>
          LOW {formatWeight(minWeight)} KG
        </Text>
        <Text className="font-mono text-xs font-black" style={{ color: chartTextColor }}>
          HIGH {formatWeight(maxWeight)} KG
        </Text>
      </View>

      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        {pathData ? <Path d={pathData} stroke={chartLineColor} strokeWidth={6} fill="none" /> : null}
        {selectedPoint && tooltipLabel ? (
          <>
            <Rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={24}
              fill={chartLineColor}
            />
            <SvgText
              x={tooltipX + tooltipWidth / 2}
              y={tooltipY + 16}
              fill={chartSurfaceColor}
              fontSize={12}
              fontWeight="900"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {tooltipLabel}
            </SvgText>
          </>
        ) : null}
        {chartPoints.map((point, index) => (
          <Rect
            key={`${point.x}-${point.y}-${index}`}
            x={point.x - 6}
            y={point.y - 6}
            width={12}
            height={12}
            fill={chartLineColor}
            onPress={() =>
              setSelectedPointIndex((currentIndex) => (currentIndex === index ? null : index))
            }
          />
        ))}
      </Svg>

      <View className="flex-row justify-between mt-3">
        <Text className="font-mono text-xs font-bold" style={{ color: chartTextColor }}>
          {formatDate(points[0].loggedDate)}
        </Text>
        <Text className="font-mono text-xs font-bold" style={{ color: chartTextColor }}>
          {formatDate(points[points.length - 1].loggedDate)}
        </Text>
      </View>
    </View>
  );
}

const formatAverage = (value: number, decimals: number = 1) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(decimals);
};

const formatWeight = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(1);
};

const formatDate = (sqlDate: string) => {
  const date = new Date(`${sqlDate}T12:00:00`);
  return date
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
};

const formatChangeLabel = (change: number) => {
  if (change === 0) {
    return 'NO CHANGE';
  }

  if (change > 0) {
    return `UP ${formatWeight(change)} KG`;
  }

  return `DOWN ${formatWeight(Math.abs(change))} KG`;
};

export default function StatsScreen() {
  const isDark = useColorScheme() === 'dark';
  const hasLoadedOnceRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [averages, setAverages] = useState<NutritionAverages>(EMPTY_AVERAGES);
  const [calorieGoalStatuses, setCalorieGoalStatuses] = useState<Last7DayCalorieGoalStatus[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightHistoryPoint[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<WeightTimeframe>('30d');
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }

    try {
      const [nextStreak, nextAverages, nextCalorieGoalStatuses, nextWeightHistory] = await Promise.all([
        getLoggingStreak(),
        getLast7DayNutritionAverages(),
        getLast7DayCalorieGoalStatuses(),
        getWeightHistory(selectedTimeframe),
      ]);

      setStreak(nextStreak);
      setAverages(nextAverages);
      setCalorieGoalStatuses(nextCalorieGoalStatuses);
      setWeightHistory(nextWeightHistory);
    } catch (error) {
      console.error('Failed to load statistics', error);
      Alert.alert('ERROR', 'FAILED TO LOAD STATS.');
    } finally {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
    }
  }, [selectedTimeframe]);

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
  const changeSummary = summarizeWeightChange(weightHistory);
  const timeframeLabel =
    TIMEFRAME_OPTIONS.find((option) => option.id === selectedTimeframe)?.helper ?? 'LAST 30 DAYS';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View className="items-center py-2.5 mb-2.5">
        <Text className="font-mono text-xl font-black text-black">STATS</Text>
      </View>

      <ScrollView contentContainerClassName="p-5 pb-10">
        <View className="mb-10">
          <Text className="font-mono text-xl font-black text-black mb-1.5">CURRENT STREAK</Text>
          <View className="h-1 bg-black mb-5" />

          <View className="border-4 border-black bg-white px-6 py-8 items-center">
            <Text
              className="font-mono font-black text-black tracking-tighter"
              style={{ fontSize: 88, lineHeight: 88 }}
            >
              {streak}
            </Text>
            <Text className="font-mono text-base font-black text-black mt-3">DAYS IN A ROW</Text>
            <View className="flex-row justify-center gap-2 mt-4">
              {calorieGoalStatuses.map((day) => (
                <StreakDayDot key={day.loggedDate} status={day.status} />
              ))}
            </View>
          </View>

          <Text className="font-mono text-sm font-bold text-black mt-4">
            {streak > 0 ? 'YOU KEEP SHOWING UP.' : 'LOG TODAY. WAKE THE STREAK UP.'}
          </Text>
        </View>

        <View className="mb-10">
          <Text className="font-mono text-xl font-black text-black mb-1.5">WEIGHT TREND</Text>
          <View className="h-1 bg-black mb-3" />
          <Text className="font-mono text-xs font-bold text-black mb-5">{timeframeLabel}</Text>

          <WeightChart points={weightHistory} isDark={isDark} />

          <View className="flex-row mt-5 mb-4 gap-2">
            {TIMEFRAME_OPTIONS.map((option) => (
              <TimeframeButton
                key={option.id}
                label={option.label}
                selected={selectedTimeframe === option.id}
                onPress={() => setSelectedTimeframe(option.id)}
              />
            ))}
          </View>

          <Text className="font-mono text-sm font-black text-black">
            {weightHistory.length > 1
              ? `TOTAL CHANGE: ${formatChangeLabel(changeSummary.change)}`
              : weightHistory.length === 1
                ? 'ONLY ONE DATA POINT. CHANGE COMES LATER.'
                : 'NO CHANGE TEXT YET BECAUSE THERE IS NO DATA YET.'}
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
