export interface DailyNutritionTotals {
  loggedDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutritionAverages {
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFats: number;
  daysLogged: number;
}

export type CalorieGoalStatus = 'no_logs' | 'met' | 'over';

export interface Last7DayCalorieGoalStatus {
  loggedDate: string;
  status: CalorieGoalStatus;
  calories: number;
}

export interface DailyCalorieGoalAdjustment {
  loggedDate: string;
  adjustmentCalories: number;
}

export type WeightTimeframe = '30d' | '1y' | 'all';

export interface WeightHistoryPoint {
  loggedDate: string;
  loggedAt: string;
  weight: number;
}

export interface WeightChangeSummary {
  startWeight: number | null;
  endWeight: number | null;
  change: number;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export const getLocalSqlDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const shiftSqlDate = (dateString: string, deltaDays: number): string => {
  const shiftedDate = new Date(`${dateString}T12:00:00`);
  shiftedDate.setDate(shiftedDate.getDate() + deltaDays);
  return getLocalSqlDate(shiftedDate);
};

export const getWeightRangeStartDate = (
  timeframe: WeightTimeframe,
  referenceDate: Date = new Date()
): string | null => {
  const endDate = getLocalSqlDate(referenceDate);

  if (timeframe === 'all') {
    return null;
  }

  if (timeframe === '30d') {
    return shiftSqlDate(endDate, -29);
  }

  return shiftSqlDate(endDate, -364);
};

export const calculateLoggingStreak = (
  loggedDates: string[],
  referenceDate: Date = new Date()
): number => {
  const uniqueDates = new Set(loggedDates);
  const today = getLocalSqlDate(referenceDate);
  const yesterday = shiftSqlDate(today, -1);

  let cursor = today;
  if (!uniqueDates.has(today)) {
    if (!uniqueDates.has(yesterday)) {
      return 0;
    }

    cursor = yesterday;
  }

  let streak = 0;
  while (uniqueDates.has(cursor)) {
    streak += 1;
    cursor = shiftSqlDate(cursor, -1);
  }

  return streak;
};

export const calculateNutritionAverages = (
  days: DailyNutritionTotals[]
): NutritionAverages => {
  if (days.length === 0) {
    return {
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFats: 0,
      daysLogged: 0,
    };
  }

  const totals = days.reduce(
    (acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fats: acc.fats + day.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return {
    averageCalories: totals.calories / days.length,
    averageProtein: totals.protein / days.length,
    averageCarbs: totals.carbs / days.length,
    averageFats: totals.fats / days.length,
    daysLogged: days.length,
  };
};

export const buildLast7DayCalorieGoalStatuses = (
  days: Pick<DailyNutritionTotals, 'loggedDate' | 'calories'>[],
  calorieGoal: number,
  referenceDate: Date = new Date(),
  goalAdjustments: DailyCalorieGoalAdjustment[] = []
): Last7DayCalorieGoalStatus[] => {
  const totalsByDate = new Map(days.map((day) => [day.loggedDate, day.calories]));
  const adjustmentsByDate = new Map(
    goalAdjustments.map((day) => [day.loggedDate, day.adjustmentCalories])
  );
  const today = getLocalSqlDate(referenceDate);

  return Array.from({ length: 7 }, (_, index) => {
    const loggedDate = shiftSqlDate(today, index - 6);
    const calories = totalsByDate.get(loggedDate) ?? 0;

    if (!totalsByDate.has(loggedDate)) {
      return {
        loggedDate,
        status: 'no_logs' as const,
        calories: 0,
      };
    }

    return {
      loggedDate,
      status:
        calories > calorieGoal + (adjustmentsByDate.get(loggedDate) ?? 0)
          ? ('over' as const)
          : ('met' as const),
      calories,
    };
  });
};

export const summarizeWeightChange = (
  points: WeightHistoryPoint[]
): WeightChangeSummary => {
  if (points.length === 0) {
    return {
      startWeight: null,
      endWeight: null,
      change: 0,
    };
  }

  const startWeight = points[0].weight;
  const endWeight = points[points.length - 1].weight;

  return {
    startWeight,
    endWeight,
    change: endWeight - startWeight,
  };
};

export const buildWeightChartPoints = (
  points: WeightHistoryPoint[],
  width: number,
  height: number,
  padding: number = 16
): ChartPoint[] => {
  if (points.length === 0) {
    return [];
  }

  if (points.length === 1) {
    return [
      {
        x: width / 2,
        y: height / 2,
      },
    ];
  }

  const weights = points.map((point) => point.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const weightRange = maxWeight - minWeight || 1;

  return points.map((point, index) => {
    const progress = index / (points.length - 1);
    const normalizedWeight = (point.weight - minWeight) / weightRange;

    return {
      x: padding + usableWidth * progress,
      y: height - padding - usableHeight * normalizedWeight,
    };
  });
};

export const buildSvgLinePath = (points: ChartPoint[]): string => {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .join(' ');
};
