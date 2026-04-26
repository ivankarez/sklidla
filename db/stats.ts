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
