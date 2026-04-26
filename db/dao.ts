import { getDb } from './database';
import {
  getWeightRangeStartDate,
  calculateLoggingStreak,
  calculateNutritionAverages,
  buildLast7DayCalorieGoalStatuses,
  DailyCalorieGoalAdjustment,
  DailyNutritionTotals,
  NutritionAverages,
  Last7DayCalorieGoalStatus,
  WeightHistoryPoint,
  WeightTimeframe,
} from './stats';
import {
  DEFAULT_MEASUREMENT_SYSTEM,
  isMeasurementSystem,
  MEASUREMENT_SYSTEM_SETTING_KEY,
  type MeasurementSystem,
} from '@/utils/measurements';

export const getSetting = async (key: string): Promise<string | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return result?.value || null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
};

export interface UserProfile {
  gender: string;
  age: string;
  weight: string;
  height: string;
  activityLevel: string;
  goal: string;
  dietaryPreference: string;
}

export interface MacroGoals {
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

export type ActivityType = 'walking' | 'running' | 'cycling' | 'other';

export interface ActivityEntry {
  id: number;
  activity_type: ActivityType;
  duration_minutes: number;
  calories_burned: number;
  logged_at: string;
}

export type ActivityCalorieInclusionMode = 'none' | 'half' | 'all';

export interface ActivityCalorieSettings {
  enabled: boolean;
  inclusionMode: ActivityCalorieInclusionMode;
}

export type WaterStepAmount = 100 | 250 | 300;

export interface WaterTrackingSettings {
  enabled: boolean;
  stepAmountMl: WaterStepAmount;
}

export interface SaveUserProfileOptions {
  recordWeightHistory?: boolean;
  recordedAt?: string;
}

export interface WeightLog {
  id: number;
  weight: number;
  loggedAt: string;
  loggedDate: string;
}

const DEFAULT_USER_PROFILE: UserProfile = {
  gender: 'nonbinary',
  age: '',
  weight: '',
  height: '',
  activityLevel: 'sedentary',
  goal: 'maintain',
  dietaryPreference: 'meathead',
};

const DEFAULT_MACRO_GOALS: MacroGoals = {
  calories: '2000',
  protein: '150',
  carbs: '200',
  fats: '65',
};

const DEFAULT_ACTIVITY_CALORIE_SETTINGS: ActivityCalorieSettings = {
  enabled: true,
  inclusionMode: 'half',
};

const DEFAULT_WATER_TRACKING_SETTINGS: WaterTrackingSettings = {
  enabled: true,
  stepAmountMl: 250,
};

const PROFILE_SETTING_KEYS = {
  gender: 'bio_gender',
  age: 'bio_age',
  weight: 'bio_weight',
  height: 'bio_height',
  activityLevel: 'bio_activity',
  goal: 'bio_goal',
  dietaryPreference: 'bio_diet',
} as const;

const ACTIVITY_CALORIE_SETTING_KEYS = {
  enabled: 'activity_calorie_adjustment_enabled',
  inclusionMode: 'activity_calorie_inclusion_mode',
} as const;

const WATER_TRACKING_SETTING_KEYS = {
  enabled: 'water_tracking_enabled',
  stepAmountMl: 'water_tracking_step_amount_ml',
} as const;

const ACTIVITY_CALORIE_INCLUSION_MULTIPLIERS: Record<ActivityCalorieInclusionMode, number> = {
  none: 0,
  half: 0.5,
  all: 1,
};

const isActivityCalorieInclusionMode = (
  value: string | null
): value is ActivityCalorieInclusionMode =>
  value === 'none' || value === 'half' || value === 'all';

const isWaterStepAmount = (value: number): value is WaterStepAmount =>
  value === 100 || value === 250 || value === 300;

const normalizeWaterStepAmount = (value: string | null): WaterStepAmount => {
  const parsed = Number.parseInt(value ?? '', 10);
  return isWaterStepAmount(parsed) ? parsed : DEFAULT_WATER_TRACKING_SETTINGS.stepAmountMl;
};

const normalizeWeightValue = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const [
    gender,
    age,
    weight,
    height,
    activityLevel,
    goal,
    dietaryPreference,
  ] = await Promise.all([
    getSetting(PROFILE_SETTING_KEYS.gender),
    getSetting(PROFILE_SETTING_KEYS.age),
    getSetting(PROFILE_SETTING_KEYS.weight),
    getSetting(PROFILE_SETTING_KEYS.height),
    getSetting(PROFILE_SETTING_KEYS.activityLevel),
    getSetting(PROFILE_SETTING_KEYS.goal),
    getSetting(PROFILE_SETTING_KEYS.dietaryPreference),
  ]);

  return {
    gender: gender ?? DEFAULT_USER_PROFILE.gender,
    age: age ?? DEFAULT_USER_PROFILE.age,
    weight: weight ?? DEFAULT_USER_PROFILE.weight,
    height: height ?? DEFAULT_USER_PROFILE.height,
    activityLevel: activityLevel ?? DEFAULT_USER_PROFILE.activityLevel,
    goal: goal ?? DEFAULT_USER_PROFILE.goal,
    dietaryPreference: dietaryPreference ?? DEFAULT_USER_PROFILE.dietaryPreference,
  };
};

export const getMeasurementSystem = async (): Promise<MeasurementSystem> => {
  const value = await getSetting(MEASUREMENT_SYSTEM_SETTING_KEY);
  return isMeasurementSystem(value) ? value : DEFAULT_MEASUREMENT_SYSTEM;
};

export const saveMeasurementSystem = async (system: MeasurementSystem): Promise<void> => {
  await setSetting(MEASUREMENT_SYSTEM_SETTING_KEY, system);
};

export const saveUserProfile = async (
  profile: UserProfile,
  options: SaveUserProfileOptions = {}
): Promise<void> => {
  const db = await getDb();
  const previousWeight = await getSetting(PROFILE_SETTING_KEYS.weight);

  await Promise.all([
    setSetting(PROFILE_SETTING_KEYS.gender, profile.gender),
    setSetting(PROFILE_SETTING_KEYS.age, profile.age),
    setSetting(PROFILE_SETTING_KEYS.weight, profile.weight),
    setSetting(PROFILE_SETTING_KEYS.height, profile.height),
    setSetting(PROFILE_SETTING_KEYS.activityLevel, profile.activityLevel),
    setSetting(PROFILE_SETTING_KEYS.goal, profile.goal),
    setSetting(PROFILE_SETTING_KEYS.dietaryPreference, profile.dietaryPreference),
  ]);

  if (!options.recordWeightHistory) {
    return;
  }

  const nextWeight = normalizeWeightValue(profile.weight);
  const normalizedPreviousWeight = normalizeWeightValue(previousWeight ?? '');

  if (nextWeight === null || nextWeight === normalizedPreviousWeight) {
    return;
  }

  if (options.recordedAt) {
    await db.runAsync(
      'INSERT INTO weight_logs (weight, logged_at) VALUES (?, ?)',
      [nextWeight, options.recordedAt]
    );
    return;
  }

  await db.runAsync(
    'INSERT INTO weight_logs (weight) VALUES (?)',
    [nextWeight]
  );
};

export const getMacroGoals = async (): Promise<MacroGoals> => {
  const [calories, protein, carbs, fats] = await Promise.all([
    getSetting('goal_calories'),
    getSetting('goal_protein'),
    getSetting('goal_carbs'),
    getSetting('goal_fats'),
  ]);

  return {
    calories: calories ?? DEFAULT_MACRO_GOALS.calories,
    protein: protein ?? DEFAULT_MACRO_GOALS.protein,
    carbs: carbs ?? DEFAULT_MACRO_GOALS.carbs,
    fats: fats ?? DEFAULT_MACRO_GOALS.fats,
  };
};

export const saveMacroGoals = async (goals: MacroGoals): Promise<void> => {
  await Promise.all([
    setSetting('goal_calories', goals.calories || DEFAULT_MACRO_GOALS.calories),
    setSetting('goal_protein', goals.protein || DEFAULT_MACRO_GOALS.protein),
    setSetting('goal_carbs', goals.carbs || DEFAULT_MACRO_GOALS.carbs),
    setSetting('goal_fats', goals.fats || DEFAULT_MACRO_GOALS.fats),
  ]);
};

export const getActivityCalorieSettings = async (): Promise<ActivityCalorieSettings> => {
  const [enabled, inclusionMode] = await Promise.all([
    getSetting(ACTIVITY_CALORIE_SETTING_KEYS.enabled),
    getSetting(ACTIVITY_CALORIE_SETTING_KEYS.inclusionMode),
  ]);

  return {
    enabled:
      enabled === null ? DEFAULT_ACTIVITY_CALORIE_SETTINGS.enabled : enabled === 'true',
    inclusionMode: isActivityCalorieInclusionMode(inclusionMode)
      ? inclusionMode
      : DEFAULT_ACTIVITY_CALORIE_SETTINGS.inclusionMode,
  };
};

export const saveActivityCalorieSettings = async (
  settings: ActivityCalorieSettings
): Promise<void> => {
  await Promise.all([
    setSetting(ACTIVITY_CALORIE_SETTING_KEYS.enabled, settings.enabled ? 'true' : 'false'),
    setSetting(ACTIVITY_CALORIE_SETTING_KEYS.inclusionMode, settings.inclusionMode),
  ]);
};

export const calculateEffectiveActivityCalories = (
  caloriesBurned: number,
  settings: ActivityCalorieSettings
): number => {
  if (!settings.enabled) {
    return 0;
  }

  return Number(
    (caloriesBurned * ACTIVITY_CALORIE_INCLUSION_MULTIPLIERS[settings.inclusionMode]).toFixed(2)
  );
};

export const getWaterTrackingSettings = async (): Promise<WaterTrackingSettings> => {
  const [enabled, stepAmountMl] = await Promise.all([
    getSetting(WATER_TRACKING_SETTING_KEYS.enabled),
    getSetting(WATER_TRACKING_SETTING_KEYS.stepAmountMl),
  ]);

  return {
    enabled: enabled === null ? DEFAULT_WATER_TRACKING_SETTINGS.enabled : enabled === 'true',
    stepAmountMl: normalizeWaterStepAmount(stepAmountMl),
  };
};

export const saveWaterTrackingSettings = async (
  settings: WaterTrackingSettings
): Promise<void> => {
  await Promise.all([
    setSetting(WATER_TRACKING_SETTING_KEYS.enabled, settings.enabled ? 'true' : 'false'),
    setSetting(WATER_TRACKING_SETTING_KEYS.stepAmountMl, settings.stepAmountMl.toString()),
  ]);
};

export const getWaterIntakeByDate = async (dateString: string): Promise<number> => {
  const db = await getDb();
  const result = await db.getFirstAsync<{ total_ml: number | null }>(
    `SELECT COALESCE(SUM(amount_ml), 0) AS total_ml
     FROM water_logs
     WHERE date(logged_at, 'localtime') = ?`,
    [dateString]
  );

  return result?.total_ml ?? 0;
};

export const adjustWaterIntakeByDate = async (
  dateString: string,
  deltaMl: number,
  loggedAt?: string
): Promise<number> => {
  const db = await getDb();
  const currentTotal = await getWaterIntakeByDate(dateString);
  const normalizedDelta = deltaMl < 0 ? Math.max(deltaMl, -currentTotal) : deltaMl;

  if (normalizedDelta === 0) {
    return currentTotal;
  }

  await db.runAsync(
    `INSERT INTO water_logs (amount_ml, logged_at)
     VALUES (?, COALESCE(?, CURRENT_TIMESTAMP))`,
    [normalizedDelta, loggedAt ?? null]
  );

  return currentTotal + normalizedDelta;
};

export const getWeightHistory = async (
  timeframe: WeightTimeframe,
  referenceDate: Date = new Date()
): Promise<WeightHistoryPoint[]> => {
  const db = await getDb();
  const startDate = getWeightRangeStartDate(timeframe, referenceDate);

  const rows = await db.getAllAsync<{
    id: number;
    weight: number;
    logged_at: string;
    logged_date: string;
  }>(
    `SELECT
       id,
       weight,
       logged_at,
       date(logged_at, 'localtime') AS logged_date
     FROM weight_logs
     WHERE (? IS NULL OR date(logged_at, 'localtime') >= ?)
     ORDER BY logged_at ASC, id ASC`,
    [startDate, startDate]
  );

  const latestEntryByDay = new Map<string, WeightHistoryPoint>();

  rows.forEach((row) => {
    latestEntryByDay.set(row.logged_date, {
      loggedDate: row.logged_date,
      loggedAt: row.logged_at,
      weight: row.weight,
    });
  });

  return Array.from(latestEntryByDay.values()).sort((left, right) =>
    left.loggedDate.localeCompare(right.loggedDate)
  );
};

export interface Food {
  id: number;
  name: string;
  brand: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
}

export const addFood = async (food: Omit<Food, 'id'>): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO foods (name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      food.name,
      food.brand || null,
      food.calories_per_100g,
      food.protein_per_100g,
      food.carbs_per_100g,
      food.fats_per_100g,
    ]
  );
  return result.lastInsertRowId;
};

export const updateFood = async (id: number, food: Omit<Food, 'id'>): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE foods SET name = ?, brand = ?, calories_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fats_per_100g = ?
     WHERE id = ?`,
    [
      food.name,
      food.brand || null,
      food.calories_per_100g,
      food.protein_per_100g,
      food.carbs_per_100g,
      food.fats_per_100g,
      id,
    ]
  );
};

export const searchFoods = async (query: string): Promise<Food[]> => {
  const db = await getDb();
  return await db.getAllAsync<Food>(
    `SELECT f.* 
     FROM foods f 
     LEFT JOIN logs l ON f.id = l.food_id 
     WHERE f.name LIKE ? OR f.brand LIKE ? 
     GROUP BY f.id 
     ORDER BY MAX(l.logged_at) DESC NULLS LAST, f.name ASC`,
    [`%${query}%`, `%${query}%`]
  );
};

export const getAllFoods = async (): Promise<Food[]> => {
  const db = await getDb();
  return await db.getAllAsync<Food>(
    `SELECT f.* 
     FROM foods f 
     LEFT JOIN logs l ON f.id = l.food_id 
     GROUP BY f.id 
     ORDER BY MAX(l.logged_at) DESC NULLS LAST, f.name ASC`
  );
};

export const addServingSize = async (foodId: number, name: string, weightInGrams: number): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO serving_sizes (food_id, name, weight_in_grams) VALUES (?, ?, ?)',
    [foodId, name, weightInGrams]
  );
  return result.lastInsertRowId;
};

export const deleteServingSizes = async (foodId: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM serving_sizes WHERE food_id = ?', [foodId]);
};

export const getServingSizes = async (foodId: number) => {
  const db = await getDb();
  return await db.getAllAsync<{ id: number, name: string, weight_in_grams: number }>(
    'SELECT * FROM serving_sizes WHERE food_id = ?',
    [foodId]
  );
};

export const logFood = async (
  foodId: number,
  servingSizeId: number | null,
  amountLogged: number,
  hardcodedCalories: number,
  hardcodedProtein: number,
  hardcodedCarbs: number,
  hardcodedFats: number
): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO logs (food_id, serving_size_id, amount_logged, hardcoded_calories, hardcoded_protein, hardcoded_carbs, hardcoded_fats)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [foodId, servingSizeId, amountLogged, hardcodedCalories, hardcodedProtein, hardcodedCarbs, hardcodedFats]
  );
  return result.lastInsertRowId;
};

export const addActivity = async (activity: {
  activityType: ActivityType;
  durationMinutes: number;
  caloriesBurned: number;
  loggedAt?: string;
}): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO activities (activity_type, duration_minutes, calories_burned, logged_at)
     VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
    [
      activity.activityType,
      activity.durationMinutes,
      activity.caloriesBurned,
      activity.loggedAt ?? null,
    ]
  );
  return result.lastInsertRowId;
};

export const getActivitiesByDate = async (dateString: string): Promise<ActivityEntry[]> => {
  const db = await getDb();
  return await db.getAllAsync<ActivityEntry>(
    `SELECT id, activity_type, duration_minutes, calories_burned, logged_at
     FROM activities
     WHERE date(logged_at, 'localtime') = ?
     ORDER BY logged_at DESC, id DESC`,
    [dateString]
  );
};

export const updateActivity = async (
  id: number,
  activityType: ActivityType,
  durationMinutes: number,
  caloriesBurned: number
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE activities
     SET activity_type = ?, duration_minutes = ?, calories_burned = ?
     WHERE id = ?`,
    [activityType, durationMinutes, caloriesBurned, id]
  );
};

export const deleteActivity = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM activities WHERE id = ?', [id]);
};

export interface LogEntry {
  id: number;
  food_id: number;
  serving_size_id: number | null;
  serving_size_name: string | null;
  amount_logged: number;
  hardcoded_calories: number;
  hardcoded_protein: number;
  hardcoded_carbs: number;
  hardcoded_fats: number;
  logged_at: string;
  name: string;
}

export const getTodaysLogs = async (): Promise<LogEntry[]> => {
  const db = await getDb();
  return await db.getAllAsync<LogEntry>(
    `SELECT l.*, f.name, s.name as serving_size_name
     FROM logs l 
     JOIN foods f ON l.food_id = f.id 
     LEFT JOIN serving_sizes s ON l.serving_size_id = s.id
     WHERE date(l.logged_at, 'localtime') = date('now', 'localtime')
     ORDER BY l.logged_at DESC`
  );
};

export const getLogsByDate = async (dateString: string): Promise<LogEntry[]> => {
  const db = await getDb();
  return await db.getAllAsync<LogEntry>(
    `SELECT l.*, f.name, s.name as serving_size_name
     FROM logs l 
     JOIN foods f ON l.food_id = f.id 
     LEFT JOIN serving_sizes s ON l.serving_size_id = s.id
     WHERE date(l.logged_at, 'localtime') = ?
     ORDER BY l.logged_at DESC`,
    [dateString]
  );
};

export const deleteLog = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM logs WHERE id = ?', [id]);
};

export const getLogById = async (id: number): Promise<(LogEntry & { calories_per_100g: number, protein_per_100g: number, carbs_per_100g: number, fats_per_100g: number }) | null> => {
  const db = await getDb();
  return await db.getFirstAsync<LogEntry & { calories_per_100g: number, protein_per_100g: number, carbs_per_100g: number, fats_per_100g: number }>(
    `SELECT l.*, f.name, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fats_per_100g
     FROM logs l 
     JOIN foods f ON l.food_id = f.id 
     WHERE l.id = ?`,
    [id]
  );
};

export const updateLog = async (
  id: number,
  servingSizeId: number | null,
  amountLogged: number,
  hardcodedCalories: number,
  hardcodedProtein: number,
  hardcodedCarbs: number,
  hardcodedFats: number
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE logs 
     SET serving_size_id = ?, amount_logged = ?, hardcoded_calories = ?, hardcoded_protein = ?, hardcoded_carbs = ?, hardcoded_fats = ?
     WHERE id = ?`,
    [servingSizeId, amountLogged, hardcodedCalories, hardcodedProtein, hardcodedCarbs, hardcodedFats, id]
  );
};

export const getLoggingStreak = async (): Promise<number> => {
  const db = await getDb();
  const rows = await db.getAllAsync<{ logged_date: string }>(
    `SELECT DISTINCT date(logged_at, 'localtime') AS logged_date
     FROM logs
     ORDER BY logged_date DESC`
  );

  return calculateLoggingStreak(rows.map((row) => row.logged_date));
};

export const getLast7DayNutritionAverages = async (): Promise<NutritionAverages> => {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    logged_date: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>(
    `SELECT
       date(logged_at, 'localtime') AS logged_date,
       SUM(hardcoded_calories) AS calories,
       SUM(hardcoded_protein) AS protein,
       SUM(hardcoded_carbs) AS carbs,
       SUM(hardcoded_fats) AS fats
     FROM logs
     WHERE date(logged_at, 'localtime') BETWEEN date('now', 'localtime', '-6 days') AND date('now', 'localtime')
     GROUP BY logged_date
     ORDER BY logged_date DESC`
  );

  const dailyTotals: DailyNutritionTotals[] = rows.map((row) => ({
    loggedDate: row.logged_date,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fats: row.fats,
  }));

  return calculateNutritionAverages(dailyTotals);
};

export const getLast7DayCalorieGoalStatuses = async (
  referenceDate: Date = new Date()
): Promise<Last7DayCalorieGoalStatus[]> => {
  const db = await getDb();
  const [rows, activityRows, macroGoals, activitySettings] = await Promise.all([
    db.getAllAsync<{
      logged_date: string;
      calories: number;
    }>(
      `SELECT
         date(logged_at, 'localtime') AS logged_date,
         SUM(hardcoded_calories) AS calories
       FROM logs
       WHERE date(logged_at, 'localtime') BETWEEN date(?, 'localtime', '-6 days') AND date(?, 'localtime')
       GROUP BY logged_date
       ORDER BY logged_date DESC`,
      [referenceDate.toISOString(), referenceDate.toISOString()]
    ),
    db.getAllAsync<{
      logged_date: string;
      calories_burned: number;
    }>(
      `SELECT
         date(logged_at, 'localtime') AS logged_date,
         SUM(calories_burned) AS calories_burned
       FROM activities
       WHERE date(logged_at, 'localtime') BETWEEN date(?, 'localtime', '-6 days') AND date(?, 'localtime')
       GROUP BY logged_date
       ORDER BY logged_date DESC`,
      [referenceDate.toISOString(), referenceDate.toISOString()]
    ),
    getMacroGoals(),
    getActivityCalorieSettings(),
  ]);

  const calorieGoal = Number.parseInt(macroGoals.calories, 10);
  const normalizedCalorieGoal = Number.isFinite(calorieGoal)
    ? calorieGoal
    : Number.parseInt(DEFAULT_MACRO_GOALS.calories, 10);
  const goalAdjustments: DailyCalorieGoalAdjustment[] = activityRows.map((row) => ({
    loggedDate: row.logged_date,
    adjustmentCalories: calculateEffectiveActivityCalories(row.calories_burned, activitySettings),
  }));

  return buildLast7DayCalorieGoalStatuses(
    rows.map((row) => ({
      loggedDate: row.logged_date,
      calories: row.calories,
    })),
    normalizedCalorieGoal,
    referenceDate,
    goalAdjustments
  );
};

export const clearAllData = async (): Promise<void> => {
  const db = await getDb();
  try {
    const tables = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
    );

    for (const t of tables) {
      // skip sqlite sequence tables if any
      if (!t.name) continue;
      // Preserve schema, remove rows
      await db.runAsync(`DELETE FROM "${t.name}"`);
    }

    // Reclaim space
    try {
      await db.execAsync('VACUUM;');
    } catch (vacErr) {
      // VACUUM may fail on some platforms — ignore
      console.warn('VACUUM failed', vacErr);
    }
  } catch (e) {
    console.error('Failed to clear database tables', e);
    throw e;
  }
};
