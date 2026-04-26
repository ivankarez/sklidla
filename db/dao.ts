import { getDb } from './database';
import {
  calculateLoggingStreak,
  calculateNutritionAverages,
  DailyNutritionTotals,
  NutritionAverages,
} from './stats';

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
